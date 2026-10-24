import { describe, expect, it } from "vitest";
import { keyPageUrlKey, keyPagePath } from "./keyPageUrlKey";

describe("keyPageUrlKey", () => {
  it("matches a Search Console URL to the stored page URL", () => {
    expect(keyPageUrlKey("http://www.example.com/")).toBe(
      keyPageUrlKey("https://example.com"),
    );
    expect(keyPageUrlKey("https://www.example.com/page#section")).toBe(
      keyPageUrlKey("https://example.com/page"),
    );
  });

  it("keeps distinct paths and queries separate", () => {
    expect(keyPageUrlKey("https://example.com/page/")).not.toBe(
      keyPageUrlKey("https://example.com/page"),
    );
    expect(keyPageUrlKey("https://example.com/page?a=1")).not.toBe(
      keyPageUrlKey("https://example.com/page?a=2"),
    );
  });
});

describe("keyPagePath", () => {
  it("displays readable Persian paths and labels the homepage", () => {
    expect(keyPagePath("https://example.com/")).toBe("صفحهٔ اصلی");
    expect(keyPagePath("https://example.com/%D8%B3%D8%A6%D9%88")).toBe("/سئو");
  });
  it("keeps malformed percent encoding readable without throwing", () => {
    expect(keyPagePath("https://example.com/%broken")).toBe("/%broken");
  });
});
