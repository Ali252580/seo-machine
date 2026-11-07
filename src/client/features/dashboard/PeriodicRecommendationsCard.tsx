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
    // Poll stored results only; rerunning the analysis can consume credits.
    refetchInterval: (result) =>
      result.state.data?.status === "running" ? 5000 : false,
  });
  const refresh = useMutation({
    mutationFn: () => refreshDashboardRecommendations({ data: { projectId } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: key }),
  });
  const data = query.data;
  return (
    <section
      id="seo-proposals"
      className="min-w-0 scroll-mt-6 space-y-6"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            نتیجهٔ بررسی و اقدام‌های پیشنهادی
          </h2>
          <p className="mt-2 text-sm leading-7 text-base-content/60">
            بر پایهٔ سرچ کنسول، آنالیتیکس و رتبهٔ کلمات همین پروژه
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          disabled={refresh.isPending || data?.status === "running"}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending || data?.status === "running"
            ? "در حال بررسی…"
            : "بررسی اکنون"}
        </button>
      </div>
      {query.isPending && <div className="skeleton mt-4 h-20" />}
      {(query.isError || refresh.isError) && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-3 text-sm text-error"
        >
          <p>
            {query.isError
              ? "دریافت پیشنهادها انجام نشد."
              : "پاسخ بررسی دریافت نشد؛ ابتدا وضعیت نتیجه را دوباره دریافت کنید."}
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={query.isFetching}
            onClick={async () => {
              const result = await query.refetch();
              if (!result.isError) refresh.reset();
            }}
          >
            {query.isFetching ? "در حال دریافت…" : "دریافت دوبارهٔ نتیجه"}
          </button>
        </div>
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
              آخرین بررسی:{" "}
              {new Date(data.updatedAt).toLocaleString("fa-IR", {
                timeZone: "Asia/Tehran",
              })}{" "}
              (تهران) ·{" "}
              {data.analysis === "skills"
                ? "تحلیل با راهنمای سئو، تحقیق کلمات کلیدی و ممیزی سئو"
                : "بر پایهٔ قواعد سئو"}
            </p>
          )}
          {data.workflow && (
            <div
              className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 sm:p-6"
              aria-label="مراحل خودکار سئو"
            >
              <h2 className="text-lg font-semibold">خروجی این بررسی چیست؟</h2>
              <p className="mt-2 text-sm leading-7">
                دریافت داده‌ها ← شناسایی فرصت‌ها ← خواندن صفحات منتخب ← تحلیل با
                مهارت‌ها ← برنامهٔ اصلاح و سنجش
              </p>
              <p className="mt-2 text-sm leading-7 text-base-content/70">
                {data.workflow.analysis === "completed"
                  ? "پیشنهادهای زیر آمادهٔ بررسی شما هستند. در هر کارت، صفحهٔ هدف، دلیل پیشنهاد و مراحل اقدام مشخص شده است؛ هیچ تغییری در سایت اجرا یا منتشر نشده است."
                  : data.workflow.message}
              </p>
              {data.workflow.analysis === "completed" && (
                <p className="mt-2 text-xs">
                  {data.workflow.pagesRead} صفحه خوانده شد ·{" "}
                  {data.items.filter((item) => item.plan).length} برنامهٔ اقدام
                </p>
              )}
            </div>
          )}
          <p className="text-xs leading-6 text-base-content/60">
            زمان‌بند روزانه پروژه‌های موعدرسیده را بررسی می‌کند؛ فاصلهٔ معمول
            بررسی هر پروژه هفت روز است. «بررسی اکنون» حداقل یک ساعت فاصله نیاز
            دارد.
          </p>
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
                      {page && item.plan?.decision !== "keep" && (
                        <Link
                          to="/p/$projectId/content"
                          params={{ projectId }}
                          search={{
                            page: page.href,
                            title: page.hasTitle ? page.title : "",
                          }}
                          className="btn btn-outline btn-sm mt-4"
                        >
                          {item.plan?.decision === "investigate"
                            ? "بررسی شواهد صفحه با SAM"
                            : "آماده‌کردن پیش‌نویس بهبود"}
                        </Link>
                      )}
                    </div>
                    <div className="space-y-4 px-4 py-4 sm:px-6">
                      {item.plan && (
                        <div className="space-y-3 rounded-lg border border-primary/20 p-4">
                          <h3 className="font-semibold">
                            {item.plan.decision === "improve"
                              ? "برنامهٔ بهبود صفحه"
                              : item.plan.decision === "keep"
                                ? "حفظ صفحه و پایش نتیجه"
                                : "بررسی تکمیلی پیش از تغییر"}
                          </h3>
                          <p className="text-sm leading-7">
                            {item.plan.rationale}
                          </p>
                          <details open>
                            <summary className="cursor-pointer text-sm font-medium text-primary">
                              مراحل اجرا، ساختار محتوا و سنجش نتیجه
                            </summary>
                            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-7">
                              {item.plan.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>
                            {item.plan.suggestedTitle && (
                              <p className="text-sm leading-7">
                                <strong>عنوان پیشنهادی: </strong>
                                {item.plan.suggestedTitle}
                              </p>
                            )}
                            {item.plan.outline.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium">
                                  ساختار پیشنهادی محتوا
                                </h4>
                                <ul className="mt-2 list-inside list-disc text-sm leading-7">
                                  {item.plan.outline.map((heading, index) => (
                                    <li key={index}>{heading}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="text-sm leading-7">
                              <strong>سنجش نتیجه: </strong>
                              {item.plan.successMeasure}
                            </p>
                          </details>
                        </div>
                      )}
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
