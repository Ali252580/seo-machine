import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  read: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.query,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({
    isPending: false,
    isError: false,
    mutate: mocks.refresh,
  }),
}));
vi.mock("@/serverFunctions/dashboard", () => ({
  getDashboardRecommendations: mocks.read,
  refreshDashboardRecommendations: mocks.refresh,
}));
import { PeriodicRecommendationsCard } from "./PeriodicRecommendationsCard";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
  });
});

it("polls only a running analysis and reads the selected project's result", async () => {
  renderToStaticMarkup(
    createElement(PeriodicRecommendationsCard, { projectId: "project-b" }),
  );
  const options = mocks.query.mock.calls[0][0];
  expect(options.queryKey).toEqual(["dashboardRecommendations", "project-b"]);
  await options.queryFn();
  expect(mocks.read).toHaveBeenCalledWith({ data: { projectId: "project-b" } });
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(
    options.refetchInterval({ state: { data: { status: "running" } } }),
  ).toBe(5000);
  for (const status of ["ready", "error", "no_data"]) {
    expect(options.refetchInterval({ state: { data: { status } } })).toBe(
      false,
    );
  }
  expect(options.refetchInterval({ state: {} })).toBe(false);
});

it("offers a separate retry for failed reads", () => {
  mocks.query.mockReturnValue({
    isError: true,
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  });
  const html = renderToStaticMarkup(
    createElement(PeriodicRecommendationsCard, { projectId: "project-b" }),
  );
  expect(html).toContain("دریافت دوبارهٔ نتیجه");
  expect(html).toContain('role="alert"');
});
