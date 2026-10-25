import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DeviceRankCell } from "./RankTrackingTableParts";

it("does not label a missing check as a lost rank", () => {
  const result = {
    position: null,
    previousPosition: 4,
    rankingUrl: null,
    serpFeatures: [],
  };
  expect(
    renderToStaticMarkup(createElement(DeviceRankCell, { result })),
  ).toContain("بررسی نشده");
  expect(
    renderToStaticMarkup(
      createElement(DeviceRankCell, {
        result: { ...result, checkedAt: "2026-10-24 09:00:00" },
      }),
    ),
  ).toContain("یافت نشد");
  expect(
    renderToStaticMarkup(
      createElement(DeviceRankCell, { result: { ...result, position: 3 } }),
    ),
  ).toContain("3");
});
