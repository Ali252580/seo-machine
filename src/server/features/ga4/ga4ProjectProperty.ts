import { gscSiteMatchesProjectDomain } from "@/server/features/gsc/gscProjectSite";

/** GA4 property reports are unfiltered, so every web stream must match the project. */
export function ga4StreamsMatchProjectDomain(
  streams: Array<{ type: string; webStreamData?: { defaultUri?: string } }>,
  projectDomain: string | null,
): boolean {
  if (!projectDomain) return false;
  const webStreams = streams.filter(
    (stream) => stream.type === "WEB_DATA_STREAM",
  );
  return (
    webStreams.length > 0 &&
    webStreams.every((stream) =>
      Boolean(
        stream.webStreamData?.defaultUri &&
        gscSiteMatchesProjectDomain(
          stream.webStreamData.defaultUri,
          projectDomain,
        ),
      ),
    )
  );
}
