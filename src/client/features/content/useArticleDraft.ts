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
) {
  return `openseo-${blog ? "blog" : "article"}-${projectId}${targetPage ? `:${targetPage}` : ""}`;
}

/** Keeps article drafts isolated by project and target URL. */
export function useArticleDraft(
  projectId: string,
  targetPage?: string,
  suggestedTitle?: string,
  blog = false,
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
  const [loaded, setLoaded] = useState(false);
  const storageKey = articleDraftKey(projectId, targetPage, blog);

  useEffect(() => {
    try {
      const saved = localDraft.safeParse(
        JSON.parse(localStorage.getItem(storageKey) ?? "null"),
      );
      if (saved.success) {
        setBrief(saved.data.brief ?? "");
        setProfile(saved.data.profile ?? (blog ? "guide" : "reference"));
        setKeyword(saved.data.keyword);
        setTitle(saved.data.title);
        setSlug(
          targetPage
            ? decodeURIComponent(
                new URL(targetPage).pathname
                  .split("/")
                  .filter(Boolean)
                  .at(-1) ?? "",
              )
            : saved.data.slug,
        );
        setContent(saved.data.content);
        setKind(blog ? "post" : (saved.data.kind ?? "page"));
        setImage(saved.data.image?.url ? saved.data.image : null);
      } else if (targetPage) {
        const pageName = recommendationPage(targetPage)?.title ?? "";
        const proposed = suggestedTitle?.split(/[|｜]/)[0].trim() || pageName;
        setKeyword(proposed.slice(0, 100));
        setTitle((suggestedTitle || pageName).slice(0, 180));
        setSlug(
          decodeURIComponent(
            new URL(targetPage).pathname.split("/").filter(Boolean).at(-1) ??
              "",
          ),
        );
      }
    } catch {
      /* A damaged local draft should not block the editor. */
    }
    setLoaded(true);
  }, [storageKey, targetPage, suggestedTitle, blog]);

  useEffect(() => {
    if (loaded)
      localStorage.setItem(
        storageKey,
        JSON.stringify({
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
    loaded,
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
