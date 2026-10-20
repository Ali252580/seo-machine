type PageMetric = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/** Keep the shortlist within the active project's domain, including its subdomains. */
export function selectImportantPages(
  rows: PageMetric[],
  projectDomain: string,
  limit = 5,
): PageMetric[] {
  const domain = projectDomain.toLowerCase().replace(/^www\./, "");
  return (
    rows
      .filter((row) => {
        try {
          const url = new URL(row.key);
          const host = url.hostname.toLowerCase().replace(/^www\./, "");
          return (
            (url.protocol === "https:" || url.protocol === "http:") &&
            (host === domain || host.endsWith(`.${domain}`))
          );
        } catch {
          return false;
        }
      })
      // The filter above creates a new array, so sorting cannot mutate GSC's rows.
      // eslint-disable-next-line unicorn/no-array-sort
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, limit)
  );
}
