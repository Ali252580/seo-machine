import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => options,
}));
vi.mock("@/serverFunctions/domain", () => ({ getDomainOverview: vi.fn() }));
import { useDomainOverviewQuery } from "./useDomainOverviewQuery";

it("does not request unsupported Iranian domain estimates but permits supported markets", () => {
  const input = {
    projectId: "project-one",
    domain: "example.com",
    scope: "domain" as const,
  };
  expect(
    useDomainOverviewQuery({ ...input, locationCode: 2364 }),
  ).toMatchObject({ enabled: false });
  expect(
    useDomainOverviewQuery({ ...input, locationCode: 2840 }),
  ).toMatchObject({
    enabled: true,
    queryKey: ["domain-overview", "project-one", "example.com", "domain", 2840],
  });
});
