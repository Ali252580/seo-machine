import { validateArticleHtml } from "@/server/features/wordpress/articleHtml";

/** Keep the evidence-rich prompt in history while showing its human request first. */
export function articleRequestSummary(text: string) {
  if (!text.includes("شواهد واقعی پیش از نگارش:")) return null;
  const match = /^برای کلمهٔ? «([^»]+)» و عنوان «([^»]+)»/.exec(text);
  return match ? { keyword: match[1], title: match[2] } : null;
}

/** Recognize a generated article even when an older reply used unsupported tags. */
export function articlePreviewHtml(text: string) {
  const html = text
    .trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return /<h2(?:\s|>)/i.test(html) && /<p(?:\s|>)/i.test(html) ? html : null;
}

/** Only this subset is ready to save as a WordPress article. */
export function articleHtml(text: string) {
  const html = articlePreviewHtml(text);
  if (!html) return null;
  try {
    validateArticleHtml(html);
    return html;
  } catch {
    return null;
  }
}

export function requireGeneratedArticle(text: string, finishReason?: string) {
  if (finishReason === "length") {
    throw new Error(
      "مدل پیش از تکمیل متن به سقف پاسخ رسید. موضوع را محدودتر کنید و دوباره بنویسید.",
    );
  }
  const html = articleHtml(text);
  if (!html)
    throw new Error(
      "مدل مقالهٔ قابل نمایش تولید نکرد؛ پاسخ خالی، توضیحی یا دارای قالب نامعتبر بود. پیش‌نویس قبلی حفظ شده است. دوباره تلاش کنید یا مدل را تغییر دهید.",
    );
  return html;
}
