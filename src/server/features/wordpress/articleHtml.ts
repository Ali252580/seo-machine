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

/** Basic publication floor; structure alone cannot establish editorial value. */
export function validateArticleDraftStructure(content: string) {
  const words = content
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const headings = [...content.matchAll(/<h2>(.*?)<\/h2>/gis)]
    .map((match) => match[1].replace(/<[^>]*>/g, "").trim())
    .filter(Boolean);
  if (words.length < 180 || new Set(headings).size < 2) {
    throw new AppError(
      "VALIDATION_ERROR",
      "پیش‌نویس برای ذخیره به دست‌کم ۱۸۰ واژه و دو بخش با تیتر متفاوت نیاز دارد. متن و ارزش افزودهٔ آن را بازبینی کنید.",
    );
  }
}
