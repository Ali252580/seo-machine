import { expect, it } from "vitest";
import { samMessageInput } from "./samMessageInput";
import { buildArticlePrompt } from "@/client/features/content/buildArticlePrompt";

const session = {
  projectId: "p",
  sessionId: "123e4567-e89b-42d3-a456-426614174000",
};
it("accepts a researched article with long URLs and a full brief", () => {
  const evidence = {
    wordpressChecked: false,
    pages: [],
    existingPage: {
      url: "https://example.com/" + "x".repeat(500),
      title: "t".repeat(180),
      text: "text".repeat(1000),
    },
    searchConsole: { status: "not_connected" },
    analytics: { status: "not_connected" },
    rankTracking: { status: "not_tracked" },
    internalLinks: [
      {
        url: "https://example.com/" + "a".repeat(450),
        title: "t".repeat(60),
        excerpt: "text",
      },
    ],
    clusterPlan: null,
    discoveredPageCount: 1,
  } as Parameters<typeof buildArticlePrompt>[2];
  const text = buildArticlePrompt(
    "k".repeat(100),
    "t".repeat(180),
    evidence,
    "page",
    "service",
    "b".repeat(400),
  );
  expect(text.length).toBeGreaterThan(4000);
  expect(
    samMessageInput.safeParse({ ...session, text, article: true }).success,
  ).toBe(true);
});
it("retains chat limits and rejects oversized or blank articles", () => {
  expect(
    samMessageInput.safeParse({ ...session, text: "x".repeat(4000) }).success,
  ).toBe(true);
  for (const article of [undefined, false])
    expect(
      samMessageInput.safeParse({ ...session, text: "x".repeat(4001), article })
        .success,
    ).toBe(false);
  for (const text of [" ", "x".repeat(8001)])
    expect(
      samMessageInput.safeParse({ ...session, text, article: true }).success,
    ).toBe(false);
});
