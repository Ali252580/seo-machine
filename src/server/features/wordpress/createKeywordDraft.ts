import { createWordPressDraft, listWordPressPages } from "./WordPressService";

export async function createKeywordDraft(
  projectId: string,
  keyword: string,
  title: string,
  content: string,
  slug: string,
  kind: "page" | "post",
) {
  const related = await listWordPressPages(projectId, keyword);
  if (related.length) return { existing: true, page: related[0] };
  return createWordPressDraft(projectId, title, content, slug, kind);
}
