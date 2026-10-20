import { describe, expect, it } from "vitest";
import { selectImportantPages } from "./selectImportantPages";

const row = (key: string, clicks: number) => ({
  key,
  clicks,
  impressions: clicks * 20,
  ctr: 0.05,
  position: 10,
});

describe("selectImportantPages", () => {
  it("selects the strongest pages only from the current domain", () => {
    expect(
      selectImportantPages(
        [
          row("https://other.com/", 1000),
          row("https://example.com.evil.test/", 900),
          row("https://example.com/service/", 30),
          row("https://blog.example.com/guide/", 20),
          row("https://example.com/", 40),
        ],
        "example.com",
        2,
      ).map((page) => page.key),
    ).toEqual(["https://example.com/", "https://example.com/service/"]);
  });
});
