import { expect, it } from "vitest";
import { keepPreviousProjectData } from "./project-query";

it("never displays one project's cached data while another project loads", () => {
  const oldReport = { siteUrl: "https://first.example/", clicks: 12 };
  expect(
    keepPreviousProjectData("second", oldReport, {
      queryKey: ["searchPerformance", "first"],
    }),
  ).toBeUndefined();
  expect(
    keepPreviousProjectData("first", oldReport, {
      queryKey: ["searchPerformance", "first", "last_28_days"],
    }),
  ).toBe(oldReport);
});
