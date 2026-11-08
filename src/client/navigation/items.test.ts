import { expect, it } from "vitest";
import { getProjectNavGroups } from "./items";

it("keeps every project section reachable once and scoped to the selected project", () => {
  for (const projectId of ["first-project", "second-project"]) {
    const items = getProjectNavGroups(projectId).flatMap(
      (group) => group.items,
    );
    expect(new Set(items.map((item) => item.to)).size).toBe(items.length);
    expect(items.map((item) => item.to)).toEqual(
      expect.arrayContaining([
        "/p/$projectId/content",
        "/p/$projectId/clusters",
        "/p/$projectId/blog",
        "/p/$projectId/context",
        "/p/$projectId/recommendations",
        "/p/$projectId/rank-tracking",
      ]),
    );
    for (const item of items) {
      if ("params" in item) {
        expect(item.params).toEqual({ projectId });
        expect(item.search).toEqual({});
      }
    }
  }
});
