import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, wordpressConnections } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { AppError } from "@/server/lib/errors";
import {
  validateArticleDraftStructure,
  validateArticleHtml,
} from "./articleHtml";

type Page = {
  id: number;
  link: string;
  slug: string;
  title: { rendered: string };
  status: string;
  kind?: "page" | "post";
};
type Credentials = { siteUrl: string; username: string; password: string };

function comparableTitle(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u064B-\u065F\u0670\u200C\u200D]/g, "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase();
}

function siteHost(domain: string) {
  return new URL(domain.includes("://") ? domain : `https://${domain}`).hostname
    .replace(/^www\./, "")
    .toLowerCase();
}

async function request<T>(
  credentials: Credentials,
  path: string,
  init?: RequestInit,
): Promise<T> {
  await normalizeAndValidateStartUrl(credentials.siteUrl);
  const url = new URL(`/wp-json/wp/v2/${path}`, credentials.siteUrl);
  const basic = btoa(
    String.fromCharCode(
      ...new TextEncoder().encode(
        `${credentials.username}:${credentials.password}`,
      ),
    ),
  );
  const response = await fetch(url, {
    ...init,
    redirect: "manual", // Credentials must never follow a cross-origin redirect.
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok)
    throw new AppError(
      "VALIDATION_ERROR",
      `WordPress API returned ${response.status}`,
    );
  return response.json();
}

export async function connectWordPress(input: {
  projectId: string;
  organizationId: string;
  userId: string;
  projectDomain: string;
  siteUrl: string;
  username: string;
  password: string;
}) {
  const siteUrl = await normalizeAndValidateStartUrl(input.siteUrl);
  const parsed = new URL(siteUrl);
  if (
    parsed.protocol !== "https:" ||
    siteHost(siteUrl) !== siteHost(input.projectDomain) ||
    parsed.pathname !== "/" ||
    parsed.search
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "WordPress URL must be the HTTPS root of the project domain.",
    );
  }
  const credentials = {
    siteUrl: parsed.origin,
    username: input.username,
    password: input.password,
  };
  const user = await request<{ capabilities?: Record<string, boolean> }>(
    credentials,
    "users/me?context=edit",
  );
  if (!user.capabilities?.edit_pages && !user.capabilities?.edit_posts) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This WordPress account cannot create pages or posts.",
    );
  }
  const secret = (await getAuth().$context).secretConfig;
  const encryptedPassword = await symmetricEncrypt({
    key: secret,
    data: input.password,
  });
  await db
    .insert(wordpressConnections)
    .values({
      projectId: input.projectId,
      organizationId: input.organizationId,
      siteUrl: credentials.siteUrl,
      username: input.username,
      encryptedPassword,
      connectedByUserId: input.userId,
    })
    .onConflictDoUpdate({
      target: wordpressConnections.projectId,
      set: {
        siteUrl: credentials.siteUrl,
        username: input.username,
        encryptedPassword,
        connectedByUserId: input.userId,
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function getWordPressConnection(projectId: string) {
  const [row] = await db
    .select()
    .from(wordpressConnections)
    .where(eq(wordpressConnections.projectId, projectId))
    .limit(1);
  return row ? { siteUrl: row.siteUrl, username: row.username } : null;
}

export async function disconnectWordPress(projectId: string) {
  await db
    .delete(wordpressConnections)
    .where(eq(wordpressConnections.projectId, projectId));
}

async function client(projectId: string): Promise<Credentials> {
  const [row] = await db
    .select()
    .from(wordpressConnections)
    .where(eq(wordpressConnections.projectId, projectId))
    .limit(1);
  if (!row)
    throw new AppError(
      "VALIDATION_ERROR",
      "WordPress is not connected for this project.",
    );
  const [project] = await db
    .select({ domain: projects.domain })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project?.domain || siteHost(project.domain) !== siteHost(row.siteUrl)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "WordPress connection no longer matches the project domain.",
    );
  }
  return {
    siteUrl: row.siteUrl,
    username: row.username,
    password: await symmetricDecrypt({
      key: (await getAuth().$context).secretConfig,
      data: row.encryptedPassword,
    }),
  };
}

export async function listWordPressPages(projectId: string, search: string) {
  const credentials = await client(projectId);
  const query = new URLSearchParams({
    context: "edit",
    per_page: "50",
    status: "any",
    search,
    _fields: "id,link,slug,title,status",
  });
  // A competing blog post can be as duplicative as a service page. Include
  // published and draft content of both kinds in the pre-writing check.
  const [pages, posts] = await Promise.all([
    request<Page[]>(credentials, `pages?${query}`),
    request<Page[]>(credentials, `posts?${query}`),
  ]);
  return [
    ...pages.map((page) => ({ ...page, kind: "page" as const })),
    ...posts.map((post) => ({ ...post, kind: "post" as const })),
  ];
}

export async function createWordPressDraft(
  projectId: string,
  title: string,
  content: string,
  slug: string,
  kind: "page" | "post" = "page",
) {
  validateArticleHtml(content);
  validateArticleDraftStructure(content);
  const credentials = await client(projectId);
  const endpoint = kind === "post" ? "posts" : "pages";
  // Check both kinds before creating a new target. A post with the same topic
  // as a page is still a duplicate, even if WordPress allows both URLs.
  const query = new URLSearchParams({
    context: "edit",
    slug,
    status: "any",
    _fields: "id,link,slug,title,status",
  });
  const existing = (
    await Promise.all([
      request<Page[]>(credentials, `pages?${query}`),
      request<Page[]>(credentials, `posts?${query}`),
    ])
  ).flat();
  if (existing.length) return { existing: true, page: existing[0] };
  const titleQuery = new URLSearchParams({
    context: "edit",
    search: title,
    status: "any",
    _fields: "id,link,slug,title,status",
  });
  const byTitle = (
    await Promise.all([
      request<Page[]>(credentials, `pages?${titleQuery}`),
      request<Page[]>(credentials, `posts?${titleQuery}`),
    ])
  ).flat();
  const duplicate = byTitle.find(
    (page) => comparableTitle(page.title.rendered) === comparableTitle(title),
  );
  if (duplicate) return { existing: true, page: duplicate };
  const page = await request<Page>(credentials, endpoint, {
    method: "POST",
    body: JSON.stringify({ title, content, slug, status: "draft" }),
  });
  return { existing: false, page };
}
