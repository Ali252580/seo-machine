import { ExternalLink, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { recommendationPage } from "./recommendationPage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardRecommendations,
  refreshDashboardRecommendations,
} from "@/serverFunctions/dashboard";

const sourceLabels: Record<string, string> = {
  connected: "داده دریافت شد",
  empty: "داده‌ای ثبت نشده",
  unavailable: "موقتاً در دسترس نیست",
  not_connected: "متصل نشده",
  not_configured: "تنظیم نشده",
};

export function PeriodicRecommendationsCard({
  projectId,
}: {
  projectId: string;
}) {
  const client = useQueryClient();
  const key = ["dashboardRecommendations", projectId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => getDashboardRecommendations({ data: { projectId } }),
  });
  const refresh = useMutation({
    mutationFn: () => refreshDashboardRecommendations({ data: { projectId } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key }),
  });
  const data = query.data;
  return (
    <section className="min-w-0 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">پیشنهادهای دوره‌ای سئو</h1>
          <p className="mt-2 text-sm leading-7 text-base-content/60">
            بر پایهٔ سرچ کنسول، آنالیتیکس و رتبهٔ کلمات همین پروژه
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? "در حال بررسی…" : "بررسی اکنون"}
        </button>
      </div>
      {query.isPending && <div className="skeleton mt-4 h-20" />}
      {(query.isError || refresh.isError) && (
        <p className="mt-4 text-sm text-error">
          دریافت پیشنهادها انجام نشد. دوباره تلاش کنید.
        </p>
      )}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["سرچ کنسول", data.sources.gsc],
                ["گوگل آنالیتیکس", data.sources.ga4],
                ["رتبهٔ کلمات", data.sources.rank],
              ] as const
            ).map(([label, status]) => (
              <div
                key={label}
                className="rounded-lg border border-base-300 bg-base-100 px-4 py-3"
              >
                <p className="text-sm font-medium">{label}</p>
                <p
                  className={`mt-2 text-xs ${status === "connected" && data.updatedAt ? "text-success" : "text-base-content/60"}`}
                >
                  {data.updatedAt
                    ? (sourceLabels[status] ?? status)
                    : "هنوز بررسی نشده"}
                </p>
              </div>
            ))}
          </div>
          {data.status === "error" && (
            <p role="alert" className="alert alert-warning text-sm">
              آخرین بررسی کامل نشد. پیشنهادهای قبلی ممکن است همچنان نمایش داده
              شوند.
            </p>
          )}
          {data.status === "running" && (
            <p role="status" className="text-sm">
              بررسی پروژه در حال انجام است.
            </p>
          )}
          {data.updatedAt && (
            <p className="mt-2 text-xs text-base-content/50">
              آخرین بررسی: {new Date(data.updatedAt).toLocaleString("fa-IR")} ·{" "}
              {data.analysis === "skills"
                ? "با مهارت‌های SAM"
                : "بر پایهٔ قواعد سئو"}
            </p>
          )}
          {data.items.length === 0 ? (
            <p className="mt-5 text-sm text-base-content/70">
              هنوز فرصت قابل‌اتکایی پیدا نشده است. اتصال‌ها و رتبه‌یابی را بررسی
              کنید.
            </p>
          ) : (
            <ol className="space-y-4">
              {data.items.map((item) => {
                const page = recommendationPage(item.page, item.pageTitle);
                return (
                  <li
                    key={item.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-base-300 bg-base-100"
                  >
                    <div className="border-b border-base-200 px-4 py-4 sm:px-6">
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Sparkles
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        {item.skill === "seo-audit"
                          ? "ممیزی سئو"
                          : item.skill === "keyword-research"
                            ? "تحقیق کلمات کلیدی"
                            : "راهنمای سئو"}
                      </div>
                      <h2 className="mt-2 text-lg font-semibold leading-8">
                        {item.title}
                      </h2>
                      {page && (
                        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs text-base-content/50">
                              {page.hasTitle
                                ? "عنوان ثبت‌شدهٔ صفحه"
                                : "نام صفحه از نشانی · عنوان ثبت نشده"}
                            </p>
                            <p
                              className="mt-1 line-clamp-2 break-words text-sm font-medium leading-7"
                              title={page.title}
                            >
                              {page.title}
                            </p>
                          </div>
                          <a
                            href={page.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={page.href}
                            className="inline-flex max-w-full shrink-0 items-center gap-2 self-start rounded-md border border-base-300 px-3 py-2 text-sm text-primary hover:bg-base-200 sm:max-w-64"
                            aria-label={`مشاهدهٔ صفحه: ${page.title}`}
                          >
                            <span dir="ltr" className="truncate">
                              {page.host}
                            </span>
                            <ExternalLink
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                          </a>
                        </div>
                      )}
                      {page && (
                        <Link
                          to="/p/$projectId/content"
                          params={{ projectId }}
                          search={{
                            page: page.href,
                            title: page.hasTitle ? page.title : "",
                          }}
                          className="btn btn-outline btn-sm mt-4"
                        >
                          بررسی و نگارش بهبود با SAM
                        </Link>
                      )}
                    </div>
                    <div className="space-y-4 px-4 py-4 sm:px-6">
                      <div>
                        <h3 className="text-sm font-medium">اقدام پیشنهادی</h3>
                        <p className="mt-1 max-w-3xl text-sm leading-7 text-base-content/75">
                          {item.action}
                        </p>
                      </div>
                      <div className="rounded-lg bg-base-200/60 p-4">
                        <h3 className="text-sm font-medium">
                          چرا این پیشنهاد؟
                        </h3>
                        <ul className="mt-2 space-y-2 text-sm leading-7 text-base-content/70">
                          {item.evidence.split("؛").map((part, index) => (
                            <li key={index}>{part.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
