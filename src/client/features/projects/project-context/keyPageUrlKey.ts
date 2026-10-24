/** Match the URL form stored by the project-context service. */
export function keyPageUrlKey(raw: string): string {
  const url = new URL(raw);
  url.protocol = "https:";
  url.hash = "";
  url.hostname = url.hostname.replace(/^www\./, "");
  return url.pathname === "/" && !url.search
    ? url.href.replace(/\/$/, "")
    : url.href;
}

export function keyPagePath(url: string): string {
  const path = new URL(url).pathname;
  if (path === "/") return "صفحهٔ اصلی";
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
