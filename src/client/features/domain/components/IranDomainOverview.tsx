import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { parseResearchTarget } from "@/shared/researchScope";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import { TotalsCards } from "@/client/features/search-performance/SearchPerformanceParts";

export function IranDomainOverview({
  projectId,
  projectDomain,
  domain,
}: {
  projectId: string;
  projectDomain?: string;
  domain: string;
}) {
  const project = parseResearchTarget(projectDomain ?? "");
  const target = parseResearchTarget(domain || projectDomain || "");
  const isProjectDomain =
    project.ok &&
    target.ok &&
    project.target.hostname === target.target.hostname;
  const query = useQuery({
    queryKey: ["searchPerformance", projectId, "last_28_days", "ALL", "irn"],
    queryFn: () =>
      getSearchPerformanceReport({
        data: { projectId, dateRange: "last_28_days", country: "irn" },
      }),
    enabled: isProjectDomain,
  });
  const report = query.data;
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-5 space-y-4">
      <h2 className="font-semibold">عملکرد سایت در جست‌وجوهای ایران</h2>
      <p className="text-sm leading-7 text-base-content/70">
        آمار واقعی سرچ کنسول برای پراپرتی متصل به همین پروژه، در ۲۸ روز گذشته و
        با فیلتر ایران. این گزارش شامل کل پراپرتی است؛ دامنه یا مسیر واردشده،
        آمار را محدود نمی‌کند. میانگین رتبه نیز جایگاه ثابت و لحظه‌ای نیست.
      </p>
      {!isProjectDomain ? (
        <p role="status" className="text-sm">
          برای دامنهٔ واردشده آمار ایران در این بخش موجود نیست. گزارش سرچ کنسول
          فقط برای سایت متصل به همین پروژه در دسترس است.
        </p>
      ) : query.isPending ? (
        <p role="status" className="text-sm">
          در حال دریافت آمار ایران…
        </p>
      ) : query.isError ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm">دریافت آمار سرچ کنسول انجام نشد.</p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            تلاش دوباره
          </button>
        </div>
      ) : report?.connected ? (
        <>
          <p className="text-xs text-base-content/60" dir="ltr">
            {report.range.startDate} — {report.range.endDate}
          </p>
          <TotalsCards report={report} />
          {report.totals.impressions === 0 ? (
            <p role="status" className="text-sm">
              در این بازه برای ایران نمایشی ثبت نشده است. در گزارش کامل
              می‌توانید بازه یا کشور را تغییر دهید.
            </p>
          ) : null}
        </>
      ) : (
        <p role="status" className="text-sm">
          برای دیدن آمار ایران، ابتدا سرچ کنسول همین پروژه را متصل کنید.
        </p>
      )}
      <Link
        to="/p/$projectId/search-performance"
        params={{ projectId }}
        className="btn btn-primary btn-sm"
      >
        {isProjectDomain && report?.connected
          ? "مشاهدهٔ کلمات و صفحات در سرچ کنسول"
          : "اتصال و مشاهدهٔ سرچ کنسول پروژه"}
      </Link>
      <p className="text-xs leading-6 text-base-content/60">
        آمار تخمینی ترافیک و کلمات دامنه‌های رقیب برای ایران در منبع فعلی این
        بخش پشتیبانی نمی‌شود.
      </p>
    </section>
  );
}
