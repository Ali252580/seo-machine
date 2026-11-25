import { z } from "zod";
import { normalizeTopicText } from "@/shared/contentClusters";

export const contentWorkspaceSearch = z.object({
  mode: z.enum(["article", "page"]).optional(),
  page: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value))
    .optional(),
  title: z.string().max(180).optional(),
  keyword: z.string().max(100).optional(),
  brief: z.string().max(400).optional(),
  draft: z
    .string()
    .max(210)
    .regex(/^(legacy|[a-f0-9-]{36}|topic-[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*)$/u)
    .optional(),
});

export function topicDraftKey(keyword: string) {
  const normalized = normalizeTopicText(keyword).slice(0, 100).trimEnd();
  return normalized ? `topic-${normalized}` : undefined;
}

export function savedDraftEntries(
  storage: Storage,
  projectId: string,
  blog: boolean,
) {
  const prefix = `openseo-${blog ? "blog" : "article"}-${projectId}`;
  const drafts: {
    title: string;
    page?: string;
    draft?: string;
    keyword?: string;
  }[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || (key !== prefix && !key.startsWith(`${prefix}:`))) continue;
    try {
      const value = JSON.parse(storage.getItem(key) ?? "null");
      if (!value || typeof value.content !== "string" || !value.content.trim())
        continue;
      const suffix = key.slice(prefix.length + 1);
      const heading = value.content
        .match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i)?.[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      drafts.push({
        ...(typeof value.keyword === "string" &&
          value.keyword.trim() && {
            keyword: value.keyword.trim().slice(0, 100),
          }),
        title:
          (typeof value.title === "string" && value.title.trim()) ||
          heading ||
          (typeof value.keyword === "string" && value.keyword.trim()) ||
          "پیش‌نویس بدون عنوان",
        ...(suffix.startsWith("draft:")
          ? { draft: suffix.slice(6) }
          : /^https?:\/\//.test(suffix)
            ? { page: suffix }
            : { draft: "legacy" }),
      });
    } catch {
      /* Preserve unreadable entries; do not delete user drafts. */
    }
  }
  return drafts;
}

export function workspaceDrafts(storage: Storage, projectId: string) {
  return (["page", "article"] as const).flatMap((mode) =>
    savedDraftEntries(storage, projectId, mode === "article").map((draft) => ({
      ...draft,
      mode,
    })),
  );
}
