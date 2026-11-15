import { expect, it } from "vitest";
import {
  sameSitePage,
  suggestClusterPages,
  contentClustersSchema,
  clusterSearchTopic,
  suggestContentClusters,
  clusterLinkTargets,
  clusterRelation,
} from "./contentClusters";
it("plans pillar links and only the two most related sibling articles", () => {
  const pillar = { url: "https://example.com/hub", title: "مرجع" };
  const pages = [
    { url: "https://example.com/a", title: "آبیاری باغ سبز" },
    { url: "https://example.com/b", title: "نگهداری باغ" },
    { url: "https://example.com/c", title: "روش آبیاری باغ" },
    { url: "https://example.com/d", title: "کاشت باغ" },
    { url: "https://example.com/e", title: "تعمیر خودرو" },
  ];
  const cluster = { pillar, pages };
  expect(clusterLinkTargets(cluster, pillar.url)).toEqual(pages);
  expect(clusterLinkTargets(cluster, pages[0].url)).toEqual([
    pillar,
    pages[2],
    pages[1],
  ]);
  expect(clusterLinkTargets(cluster, pages[4].url)).toEqual([pillar]);
  expect(clusterLinkTargets(cluster, "unknown")).toEqual([]);
  expect(
    clusterRelation(pillar, { ...pages[0], categoryUrls: [pillar.url] }),
  ).toBe("عضو دسته‌بندی");
  expect(clusterRelation(pillar, { ...pages[0], parentUrl: pillar.url })).toBe(
    "زیر‌دستهٔ ثبت‌شده",
  );
  expect(clusterRelation(pages[0], pages[2])).toContain("2 واژه");
  expect(clusterRelation(pillar, pages[4])).toBe("ارتباط نیازمند بررسی دستی");
});
it("proposes disjoint groups, deduplicates URLs and leaves unrelated pages unassigned", () => {
  const pages = [
    { url: "https://example.com/a", title: "طراحی باغ" },
    { url: "https://example.com/b", title: "هزینه طراحی باغ" },
    { url: "https://example.com/c", title: "تعمیر موتور" },
  ];
  expect(suggestContentClusters([...pages, pages[0]])).toEqual([
    { pillar: pages[0], pages: [pages[1]] },
  ]);
  expect(suggestContentClusters([])).toEqual([]);
  expect(suggestContentClusters([pages[0], pages[2]])).toEqual([]);
});

it("ranks article titles even outside category membership and ignores generic title words", () => {
  const pillar = {
    url: "https://example.com/category/roof",
    title: "روف گاردن",
    kind: "category" as const,
  };
  const article = {
    url: "https://example.com/care",
    title: "راهنمای نگهداری روف گاردن",
    kind: "article" as const,
  };
  expect(suggestClusterPages(pillar, [pillar, article])).toEqual([article]);
  expect(suggestContentClusters([pillar, article])[0].pages).toEqual([article]);
  expect(
    suggestContentClusters([
      { ...article, title: "راهنمای خرید خودرو" },
      {
        ...article,
        url: "https://example.com/other",
        title: "راهنمای نگهداری باغ",
      },
    ]),
  ).toEqual([]);
  expect(
    suggestClusterPages({ ...pillar, kind: undefined }, [
      { ...article, url: "https://example.com/weak", title: "طراحی گاردن" },
      article,
    ])[0],
  ).toEqual(article);
});
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
