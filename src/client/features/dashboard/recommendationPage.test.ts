import { describe, expect, it } from "vitest";
import { recommendationPage } from "./recommendationPage";
describe("recommendation page display", () => {
  it("decodes Persian slugs without changing the destination", () => {
    const href =
      "https://example.com/" +
      encodeURIComponent("آموزش-سئو") +
      "/?source=test";
    expect(recommendationPage(href)).toMatchObject({
      href,
      title: "آموزش سئو",
      host: "example.com",
      hasTitle: false,
    });
  });
  it("prefers recorded titles and survives missing or malformed paths", () => {
    expect(
      recommendationPage("https://example.com/a", " عنوان صفحه ")?.title,
    ).toBe("عنوان صفحه");
    expect(recommendationPage("https://example.com/")?.title).toBe(
      "صفحهٔ اصلی",
    );
    expect(recommendationPage("https://example.com/%bad")?.title).toBe("%bad");
  });
  it("rejects unsafe and absent URLs", () => {
    for (const value of [
      null,
      "bad",
      "javascript:alert(1)",
      "data:text/html,test",
    ])
      expect(recommendationPage(value)).toBeNull();
  });
});
