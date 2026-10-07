import { AppError } from "@/server/lib/errors";

/** Allow only simple article elements, without attributes or active content. */
export function validateArticleHtml(content: string) {
  const tags = content.match(/<[^>]*>/g) ?? [];
  if (
    tags.some(
      (tag) => !/^<\/?(?:h2|h3|p|ul|ol|li|strong|em|br)>$/i.test(tag),
    ) ||
    /[<>]/.test(content.replace(/<[^>]*>/g, ""))
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Article HTML contains unsupported tags or attributes.",
    );
  }
}
