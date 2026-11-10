import { useEffect, useState } from "react";
import { z } from "zod";
import type { WritingProfile } from "./writingProfiles";
import { recommendationPage } from "@/client/features/dashboard/recommendationPage";
import type { ArticleImage } from "./ArticleMediaPanel";

const localDraft = z.object({
  brief: z.string().max(400).optional(),
  profile: z
    .enum([
      "guide",
      "comparison",
      "troubleshooting",
      "reference",
      "service",
      "product",
    ])
    .optional(),
  keyword: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  kind: z.enum(["page", "post"]).optional(),
  image: z
    .object({
      id: z.number(),
      url: z.string(),
      preview: z.string(),
      mediaType: z.string(),
      alt: z.string(),
    })
    .nullable()
    .optional(),
});

export function articleDraftKey(
  projectId: string,
  targetPage?: string,
  blog = false,
  draftId?: string,
) {
  return `openseo-${blog ? "blog" : "article"}-${projectId}${targetPage ? `:${targetPage}` : draftId ? `:draft:${draftId}` : ""}`;
}

/** Resolve a complete snapshot so missing drafts never inherit another page's fields. */
export function loadArticleDraft(
  storageKey: string,
  targetPage?: string,
  suggestedTitle?: string,
  blog = false,
) {
  let data: z.infer<typeof localDraft> | undefined;
  let storageError = false;
  try {
    const saved = localDraft.safeParse(
      JSON.parse(localStorage.getItem(storageKey) ?? "null"),
    );
    if (saved.success) data = saved.data;
  } catch {
    storageError = true;
  }
  let pageSlug = "";
  if (targetPage) {
    try {
      pageSlug =
        new URL(targetPage).pathname.split("/").filter(Boolean).at(-1) ?? "";
    } catch {
      /* Invalid URLs do not discard a saved article. */
    }
    try {
      pageSlug = decodeURIComponent(pageSlug);
    } catch {
      /* Preserve literal percent characters. */
    }
  }
  const pageName = targetPage
    ? (recommendationPage(targetPage)?.title ?? "")
    : "";
  const proposed = suggestedTitle?.split(/[|｜]/)[0].trim() || pageName;
  return {
    storageError,
    draft: {
      brief: data?.brief ?? "",
      profile: data?.profile ?? (blog ? "guide" : "reference"),
      keyword: data?.keyword ?? proposed.slice(0, 100),
      title: data?.title ?? (suggestedTitle || pageName).slice(0, 180),
      slug: targetPage ? pageSlug : (data?.slug ?? ""),
      content: data?.content ?? "",
      kind: blog ? ("post" as const) : (data?.kind ?? ("page" as const)),
      image: data?.image?.url ? data.image : null,
    },
  };
}

export function persistArticleDraft(
  key: string,
  draft: z.infer<typeof localDraft>,
): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Keeps article drafts isolated by project and target URL. */
export function useArticleDraft(
  projectId: string,
  targetPage?: string,
  suggestedTitle?: string,
  blog = false,
  draftId?: string,
) {
  const [brief, setBrief] = useState("");
  const [profile, setProfile] = useState<WritingProfile>(
    blog ? "guide" : "reference",
  );
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<"page" | "post">(blog ? "post" : "page");
  const [image, setImage] = useState<ArticleImage | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const storageKey = articleDraftKey(projectId, targetPage, blog, draftId);

  useEffect(() => {
    const loaded = loadArticleDraft(
      storageKey,
      targetPage,
      suggestedTitle,
      blog,
    );
    const draft = loaded.draft;
    setBrief(draft.brief);
    setProfile(draft.profile);
    setKeyword(draft.keyword);
    setTitle(draft.title);
    setSlug(draft.slug);
    setContent(draft.content);
    setKind(draft.kind);
    setImage(draft.image);
    setStorageError(loaded.storageError);
    setLoadedKey(storageKey);
  }, [storageKey, targetPage, suggestedTitle, blog]);

  useEffect(() => {
    // Never write the previous page's state into the next page's storage key.
    if (loadedKey !== storageKey) return;
    setStorageError(
      !persistArticleDraft(storageKey, {
        brief,
        profile,
        keyword,
        title,
        slug,
        content,
        kind,
        image: image?.url ? image : null,
      }),
    );
  }, [
    loadedKey,
    storageKey,
    brief,
    profile,
    keyword,
    title,
    slug,
    content,
    kind,
    image,
  ]);

  return {
    storageError,
    brief,
    setBrief,
    profile,
    setProfile,
    keyword,
    setKeyword,
    title,
    setTitle,
    slug,
    setSlug,
    content,
    setContent,
    kind,
    setKind,
    image,
    setImage,
  };
}
