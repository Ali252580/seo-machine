import { expect, it } from "vitest";
import {
  sameSitePage,
  suggestClusterPages,
  contentClustersSchema,
  clusterSearchTopic,
} from "./contentClusters";
it("decodes category URLs into search topics without fetching the supplied URL", () => {
  expect(
    clusterSearchTopic(
      "https://example.com/category/%D8%B1%D9%88%D9%81-%DA%AF%D8%A7%D8%B1%D8%AF%D9%86/",
    ),
  ).toBe("روف گاردن");
  expect(clusterSearchTopic("  طراحی باغ  ")).toBe("طراحی باغ");
  expect(clusterSearchTopic("https://example.com/")).toBe("");
  expect(clusterSearchTopic("https://example.com/%invalid")).toBe(
    "https://example.com/%invalid",
  );
});
it("restricts cluster pages to the project host and safe protocols", () => {
  expect(sameSitePage("https://www.example.com/article", "example.com")).toBe(
    true,
  );
  for (const url of [
    "https://example.com.evil.test/a",
    "javascript:alert(1)",
    "https://user:pass@example.com/a",
    "https://other.test/a",
  ])
    expect(sameSitePage(url, "example.com")).toBe(false);
});
it("suggests overlapping titles without including the pillar itself", () => {
  const pillar = { url: "https://example.com/a", title: "راهنمای طراحی باغ" };
  const related = { url: "https://example.com/b", title: "طراحی فضای سبز" };
  expect(
    suggestClusterPages(pillar, [
      pillar,
      related,
      { url: "https://example.com/c", title: "تعمیر موتور" },
    ]),
  ).toEqual([related]);
  expect(contentClustersSchema.safeParse([{ pillar, pages: [] }]).success).toBe(
    false,
  );
});
