import { expect, it } from "vitest";
import { isRedirect } from "@tanstack/react-router";
import { Route } from "@/routes/_project/p/$projectId/blog";

it("redirects a bookmarked blog draft with its project, search and anchor intact", () => {
  const params = { projectId: "my-project" };
  const search = { draft: "legacy", title: "مقاله", keyword: "بام سبز" };
  const beforeLoad = Route.options.beforeLoad;
  if (!beforeLoad) throw new Error("Missing legacy blog redirect");
  let result: unknown;
  try {
    Reflect.apply(beforeLoad, undefined, [
      { params, search, location: { hash: "topic-research" } },
    ]);
  } catch (error) {
    result = error;
  }
  expect(isRedirect(result)).toBe(true);
  expect(result).toMatchObject({
    options: {
      to: "/p/$projectId/content",
      params,
      search: { ...search, mode: "article" },
      hash: "topic-research",
      replace: true,
    },
  });
});
