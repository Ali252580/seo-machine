import { expect, it } from "vitest";
import { findOwnSearchResults } from "./articleSearchEvidence";

it("flags only actual same-site results, not lookalike or unsafe addresses", () => {
  const rows = [
    { title: "موجود", url: "https://www.example.com/guide" },
    { title: "رقیب", url: "https://example.com.other.test/guide" },
    { title: "نامعتبر", url: "javascript:alert(1)" },
  ];
  expect(findOwnSearchResults(rows, "example.com")).toEqual([rows[0]]);
  expect(findOwnSearchResults(rows, "")).toEqual([]);
});
