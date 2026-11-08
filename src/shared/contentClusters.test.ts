import { expect, it } from "vitest";
import {
  sameSitePage,
  suggestClusterPages,
  contentClustersSchema,
} from "./contentClusters";
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
