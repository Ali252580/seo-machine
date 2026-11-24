export function findOwnSearchResults(
  items: { title: string; url: string }[],
  domain: string,
) {
  let siteHost: string;
  try {
    siteHost = new URL(
      domain.includes("://") ? domain : `https://${domain}`,
    ).hostname.replace(/^www\./, "");
  } catch {
    return [];
  }
  return items
    .filter((item) => {
      try {
        const url = new URL(item.url);
        return (
          ["https:", "http:"].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          (url.hostname === siteHost || url.hostname.endsWith(`.${siteHost}`))
        );
      } catch {
        return false;
      }
    })
    .map((item) => ({ title: item.title, url: item.url }));
}
