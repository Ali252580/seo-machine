import { expect, it } from "vitest";
import { keywordGapRows } from "./keywordGapRows";

it("includes absent and weaker terms without treating unknown ranks as weaker", () => {
  expect(
    keywordGapRows(
      [
        { keyword: "Alpha", position: 12 },
        { keyword: "beta", position: 3 },
        { keyword: "unknown", position: null },
      ],
      [
        { keyword: " alpha ", position: 2 },
        { keyword: "beta", position: 5 },
        { keyword: "unknown", position: 1 },
        { keyword: "new", position: 4 },
      ],
    ).map((row) => row.keyword),
  ).toEqual([" alpha ", "new"]);
});

it("keeps competitor opportunities when the site has no ranked keywords", () => {
  const rival = [{ keyword: "روف گاردن", position: 2 }];
  expect(keywordGapRows([], rival)).toEqual(rival);
});
