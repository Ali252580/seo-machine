import { createFileRoute } from "@tanstack/react-router";
import { PeriodicRecommendationsCard } from "@/client/features/dashboard/PeriodicRecommendationsCard";
import { ProjectAutomationSettings } from "@/client/features/projects/ProjectAutomationSettings";
export const Route = createFileRoute("/_project/p/$projectId/recommendations")({
  component: RecommendationsPage,
});
function RecommendationsPage() {
  const { projectId } = Route.useParams();
  return (
    <main className="h-full overflow-auto px-4 py-6 pb-24 md:px-6" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border-2 border-primary/30 bg-primary/10 p-6 sm:p-8">
          <p className="text-sm font-medium text-primary">خودکارسازی سئو</p>
          <h1 className="mt-2 text-2xl font-bold leading-relaxed sm:text-3xl">
            چرخهٔ خودکار سئوی همین پروژه
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7">
            داده‌های سایت بررسی می‌شوند و فرصت‌های بهبود به پیشنهادهای مشخص
            تبدیل می‌شوند. در این صفحه زمان‌بندی را فعال کنید و پیشنهاد هر صفحه
            و دلیل آن را ببینید. اجرای تغییرات و انتشار محتوا نیازمند اقدام
            شماست.
          </p>
          <ol
            className="mt-5 grid gap-3 text-sm sm:grid-cols-3"
            aria-label="چرخهٔ بررسی"
          >
            <li className="rounded-lg bg-base-100 p-3">
              ۱. دریافت داده‌های همین سایت
            </li>
            <li className="rounded-lg bg-base-100 p-3">
              ۲. تحلیل فرصت‌ها و صفحات منتخب
            </li>
            <li className="rounded-lg bg-base-100 p-3">
              ۳. پیشنهاد اقدام برای بررسی شما
            </li>
          </ol>
        </header>
        <ProjectAutomationSettings
          key={`automation-${projectId}`}
          projectId={projectId}
        />
        <PeriodicRecommendationsCard key={projectId} projectId={projectId} />
      </div>
    </main>
  );
}
