import { createFileRoute } from "@tanstack/react-router";
import { PeriodicRecommendationsCard } from "@/client/features/dashboard/PeriodicRecommendationsCard";
export const Route = createFileRoute("/_project/p/$projectId/recommendations")({
  component: RecommendationsPage,
});
function RecommendationsPage() {
  const { projectId } = Route.useParams();
  return (
    <main className="h-full overflow-auto px-4 py-6 pb-24 md:px-6" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <PeriodicRecommendationsCard key={projectId} projectId={projectId} />
      </div>
    </main>
  );
}
