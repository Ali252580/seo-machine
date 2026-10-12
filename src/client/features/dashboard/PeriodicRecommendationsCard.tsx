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

function safePageUrl(page: string | null): string | null {
  if (!page) return null;
  try {
    const url = new URL(page);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

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
    <section
      className="rounded-xl border border-base-300 bg-base-100 p-5"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">پیشنهادهای دوره‌ای سئو</h2>
          <p className="text-sm text-base-content/60">
            بر پایهٔ سرچ کنسول، آنالیتیکس و رتبهٔ کلمات همین پروژه
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
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
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-base-content/60">
            <span>
              سرچ کنسول: {sourceLabels[data.sources.gsc] ?? data.sources.gsc}
            </span>
            <span>
              آنالیتیکس: {sourceLabels[data.sources.ga4] ?? data.sources.ga4}
            </span>
            <span>
              رتبه‌ها: {sourceLabels[data.sources.rank] ?? data.sources.rank}
            </span>
          </div>
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
            <ol className="mt-4 space-y-3">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-base-200 p-3"
                >
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm">{item.action}</p>
                  <p className="mt-2 text-xs text-base-content/60">
                    {item.evidence}
                  </p>
                  {safePageUrl(item.page) && (
                    <a
                      className="mt-2 block break-all text-xs text-primary underline"
                      href={safePageUrl(item.page) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.page}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
