import { createFileRoute, redirect } from "@tanstack/react-router";
import { contentWorkspaceSearch } from "@/client/features/content/contentWorkspaceData";

export const Route = createFileRoute("/_project/p/$projectId/blog")({
  validateSearch: contentWorkspaceSearch,
  beforeLoad: ({ params, search, location }) => {
    throw redirect({
      to: "/p/$projectId/content",
      params,
      search: { ...search, mode: "article" },
      hash: location.hash,
      replace: true,
    });
  },
});
