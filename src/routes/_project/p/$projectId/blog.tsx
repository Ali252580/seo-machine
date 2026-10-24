import { createFileRoute } from "@tanstack/react-router";
import { ProjectContentEditor } from "@/client/features/content/ProjectContentEditor";

export const Route = createFileRoute("/_project/p/$projectId/blog")({
  component: BlogEditor,
});

function BlogEditor() {
  const { projectId } = Route.useParams();
  return <ProjectContentEditor key={projectId} projectId={projectId} blog />;
}
