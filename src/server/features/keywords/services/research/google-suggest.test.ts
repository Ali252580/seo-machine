import { describe, expect, it, vi } from "vitest";
import { fetchGoogleSuggestRows } from "./google-suggest";

describe("Google Suggest research rows", () => {
  it("uses Persian/Iran hints and leaves unsupported metrics empty", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url =
        input instanceof Request ? new URL(input.url) : new URL(input);
      expect(url.searchParams.get("hl")).toBe("fa");
      expect(url.searchParams.get("gl")).toBe("ir");
      return new Response(
        JSON.stringify(["سئو", ["سئو سایت", "سئو سایت", "آموزش سئو"]]),
        { status: 200 },
      );
    });
    const rows = await fetchGoogleSuggestRows(
      "سئو",
      10,
      fetcher as typeof fetch,
    );
    expect(rows.map((row) => row.keyword)).toEqual([
      "سئو",
      "سئو سایت",
      "آموزش سئو",
    ]);
    expect(rows[1]).toMatchObject({
      searchVolume: null,
      cpc: null,
      keywordDifficulty: null,
      intent: "unknown",
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
