import { createFileRoute } from "@tanstack/react-router";
import {
  ContentWorkspace,
  contentWorkspaceSearch,
} from "@/client/features/content/ContentWorkspace";

export const Route = createFileRoute("/_project/p/$projectId/content")({
  validateSearch: contentWorkspaceSearch,
  component: ContentEditor,
});

function ContentEditor() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  // A project switch must remount the draft state before local storage can write.
  return (
    <ContentWorkspace key={projectId} projectId={projectId} search={search} />
  );
}
