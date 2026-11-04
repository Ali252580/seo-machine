import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => state.query }));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ state: { matches: [] } }),
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/serverFunctions/projects", () => ({ getProjects: vi.fn() }));
vi.mock("@/client/features/projects/CreateProjectModal", () => ({
  CreateProjectModal: () => null,
}));
import { ProjectSwitcher } from "./ProjectSwitcher";

it("identifies loading instead of suggesting a missing project", () => {
  state.query = { isPending: true };
  const html = renderToStaticMarkup(
    createElement(ProjectSwitcher, { activeProjectId: null }),
  );
  expect(html).toContain("در حال دریافت پروژه‌ها…");
});

it("keeps the current project's name when a background reload fails", () => {
  state.query = {
    isPending: false,
    isError: true,
    data: [
      { id: "one", name: "پروژه اول", domain: "first.example" },
      { id: "two", name: "پروژه دوم", domain: "second.example" },
    ],
  };
  const html = renderToStaticMarkup(
    createElement(ProjectSwitcher, { activeProjectId: "two" }),
  );
  expect(html).toContain("پروژه دوم");
  expect(html).toContain("second.example");
  expect(html).not.toContain("first.example");
});
