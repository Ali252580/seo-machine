import { createFileRoute } from "@tanstack/react-router";
import { ContentClusterMap } from "@/client/features/content/ContentClusterMap";
export const Route = createFileRoute("/_project/p/$projectId/clusters")({
  component: ClusterPage,
});
function ClusterPage() {
  const { projectId } = Route.useParams();
  return <ContentClusterMap key={projectId} projectId={projectId} />;
}
