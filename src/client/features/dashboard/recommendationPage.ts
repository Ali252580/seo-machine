/** Keep the navigation URL intact while decoding only its display text. */
export function recommendationPage(page: string | null, title?: string | null) {
  if (!page) return null;
  try {
    const url = new URL(page);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const last = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    let name = last;
    try {
      name = decodeURIComponent(last);
    } catch {
      /* A malformed escape must not break the list. */
    }
    return {
      href: url.href,
      host: url.host,
      title: title?.trim() || name.replace(/[-_]+/g, " ") || "صفحهٔ اصلی",
      hasTitle: Boolean(title?.trim()),
    };
  } catch {
    return null;
  }
}
