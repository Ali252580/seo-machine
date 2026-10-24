import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpLeft, ChartNoAxesColumn } from "lucide-react";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  formatCount,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { getImportantPages } from "@/serverFunctions/searchPerformance";
import { keyPageUrlKey, keyPagePath } from "./keyPageUrlKey";
import {
  EmptyState,
  SectionHeader,
  useContextUpdate,
  type ContextKeyPage,
} from "./shared";

export function ImportantPagesFromGsc({
  projectId,
  keyPages,
  onEditPage,
}: {
  projectId: string;
  keyPages: ContextKeyPage[];
  onEditPage: (pageId: string) => void;
}) {
  const update = useContextUpdate(projectId);
  const query = useQuery({
    queryKey: ["importantPages", projectId],
    queryFn: () => getImportantPages({ data: { projectId } }),
    staleTime: 30 * 60 * 1000,
  });
  const pages = query.data?.pages ?? [];
  const maxClicks = Math.max(1, ...pages.map((page) => page.clicks));
  const registeredPages = new Map(
    keyPages.map((page) => [keyPageUrlKey(page.url), page]),
  );

  return (
    <section className="space-y-3" dir="rtl">
      <SectionHeader
        title="صفحات مهم"
        hint="پنج صفحهٔ برتر همین پروژه از سرچ کنسول در سه ماه گذشته"
        action={
          <Link
            to="/p/$projectId/search-performance"
            params={{ projectId }}
            className="btn btn-ghost btn-xs shrink-0"
          >
            تحلیل کامل
            <ArrowUpLeft className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {query.isPending ? (
        <div
          className="flex justify-center rounded-xl border border-base-300 py-8"
          role="status"
          aria-label="در حال دریافت صفحات مهم"
        >
          <span className="loading loading-spinner loading-sm" />
        </div>
      ) : query.isError ? (
        <div className="alert alert-error text-sm">
          {getStandardErrorMessage(query.error, "دریافت صفحات مهم ناموفق بود.")}
        </div>
      ) : !query.data?.connected ? (
        <EmptyState>
          برای نمایش صفحات مهم، سرچ کنسول را به همین پروژه وصل کنید.
        </EmptyState>
      ) : pages.length === 0 ? (
        <EmptyState>
          در سه ماه گذشته صفحه‌ای از دامنهٔ این پروژه در داده‌های سرچ کنسول یافت
          نشد.
        </EmptyState>
      ) : (
        <ol className="grid gap-3 md:grid-cols-2">
          {pages.map((page, index) => (
            <li
              key={page.key}
              className="min-w-0 rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={page.key}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-1 text-sm font-semibold leading-6 hover:text-primary"
                    title={page.key}
                  >
                    <span className="line-clamp-2">
                      {page.title || keyPagePath(page.key)}
                    </span>
                    <ArrowUpLeft
                      className="mt-1 size-3.5 shrink-0 opacity-50 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </a>
                  <p
                    className="mt-0.5 truncate text-xs text-base-content/50"
                    dir="ltr"
                    title={page.key}
                  >
                    {keyPagePath(page.key)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-base-300 pt-3 text-center">
                <div>
                  <p className="text-xs text-base-content/50">کلیک</p>
                  <p className="font-semibold tabular-nums">
                    {formatCount(page.clicks)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50">نمایش</p>
                  <p className="font-semibold tabular-nums">
                    {formatCount(page.impressions)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/50">میانگین رتبه</p>
                  <p className="font-semibold tabular-nums">
                    {formatPosition(page.position)}
                  </p>
                </div>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-200"
                role="img"
                aria-label={`سهم نسبی کلیک‌ها: ${Math.round((page.clicks / maxClicks) * 100)} درصد`}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(page.clicks / maxClicks) * 100}%` }}
                />
              </div>
              <button
                type="button"
                className="btn btn-outline btn-xs mt-3"
                disabled={update.isPending}
                onClick={() => {
                  const registered = registeredPages.get(
                    keyPageUrlKey(page.key),
                  );
                  if (registered) onEditPage(registered.id);
                  else update.mutate([{ addKeyPages: [{ url: page.key }] }]);
                }}
              >
                {registeredPages.has(keyPageUrlKey(page.key))
                  ? "ویرایش صفحهٔ ثبت‌شده"
                  : "افزودن به زمینهٔ پروژه"}
              </button>
            </li>
          ))}
        </ol>
      )}
      {pages.length > 0 ? (
        <p className="flex items-center gap-1 text-xs text-base-content/50">
          <ChartNoAxesColumn className="size-3.5" aria-hidden="true" />
          مرتب‌شده بر پایهٔ کلیک؛ عنوان‌ها از خود سایت خوانده می‌شوند.
        </p>
      ) : null}
    </section>
  );
}
