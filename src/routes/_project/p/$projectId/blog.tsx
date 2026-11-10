import { createFileRoute } from "@tanstack/react-router";
import {
  ContentWorkspace,
  contentWorkspaceSearch,
} from "@/client/features/content/ContentWorkspace";

export const Route = createFileRoute("/_project/p/$projectId/blog")({
  validateSearch: contentWorkspaceSearch,
  component: BlogEditor,
});

function BlogEditor() {
  const { projectId } = Route.useParams();
  return (
    <ContentWorkspace
      key={projectId}
      projectId={projectId}
      search={Route.useSearch()}
      blog
    />
  );
}
