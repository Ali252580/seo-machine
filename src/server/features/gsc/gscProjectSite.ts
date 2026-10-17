function host(value: string) {
  return new URL(value.includes("://") ? value : `https://${value}`).hostname
    .toLowerCase()
    .replace(/^www\./, "");
}

/** A Google grant may contain many sites; a project's selected site must match its domain. */
export function gscSiteMatchesProjectDomain(
  siteUrl: string,
  projectDomain: string | null,
): boolean {
  if (!projectDomain) return true;
  try {
    const projectHost = host(projectDomain);
    if (siteUrl.startsWith("sc-domain:")) {
      const propertyHost = host(siteUrl.slice("sc-domain:".length));
      // A parent domain property includes sibling subdomains, so it is not isolated.
      return projectHost === propertyHost;
    }
    return projectHost === host(siteUrl);
  } catch {
    return false;
  }
}
