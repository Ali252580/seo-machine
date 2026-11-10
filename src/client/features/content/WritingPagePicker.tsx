import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getWritingPages } from "@/serverFunctions/contentClusters";
import { ClusterPageDiscovery } from "./ClusterPageDiscovery";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

export function WritingPagePicker({
  projectId,
  targetPage,
}: {
  projectId: string;
  targetPage?: string;
}) {
  const [search, setSearch] = useState("");
  const pages = useQuery({
    queryKey: ["writingPages", projectId],
    queryFn: () => getWritingPages({ data: { projectId } }),
  });
  const filtered = (pages.data ?? []).filter((page) =>
    `${page.title} ${page.url}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <section
      className="space-y-3 rounded-xl border-2 border-primary/30 p-4"
      aria-label="انتخاب صفحه برای نگارش"
    >
      <h2 className="text-lg font-semibold">صفحات سایت برای نگارش و بهبود</h2>
      <p className="text-sm">
        یک صفحه را انتخاب کنید تا پیش‌نویس مستقل همان صفحه باز شود. متن مقالهٔ
        قبلی پایین صفحه، پیش‌نویس ذخیره‌شده است؛ فهرست صفحات سایت نیست.
      </p>
      <input
        className="input input-bordered w-full"
        aria-label="جست‌وجوی صفحات سایت"
        placeholder="جست‌وجوی عنوان یا نشانی"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {pages.isPending && <p role="status">در حال دریافت صفحات…</p>}
      {pages.error && (
        <p role="alert">
          {getStandardErrorMessage(pages.error)}{" "}
          <button className="btn btn-sm" onClick={() => void pages.refetch()}>
            تلاش مجدد
          </button>
        </p>
      )}
      {pages.data && (
        <p className="text-sm">
          {filtered.length} از {pages.data.length} صفحهٔ شناسایی‌شده
        </p>
      )}
      <ul className="max-h-72 space-y-2 overflow-auto">
        {filtered.map((page) => (
          <li key={page.url} className="rounded-lg border border-base-300 p-3">
            <Link
              className="link font-medium"
              to="/p/$projectId/content"
              params={{ projectId }}
              search={{ page: page.url, title: page.title }}
              aria-current={targetPage === page.url ? "page" : undefined}
            >
              {page.title}{" "}
              {targetPage === page.url
                ? "(صفحهٔ انتخاب‌شده)"
                : "— بهبود این صفحه"}
            </Link>
            <span
              dir="ltr"
              className="block break-all text-xs text-base-content/60"
            >
              {page.url}
            </span>
          </li>
        ))}
      </ul>
      {pages.data?.length === 0 && (
        <p>
          هنوز صفحه‌ای ذخیره نشده است؛ از گزینهٔ زیر صفحات را دریافت کنید. نقشهٔ
          سایت به اتصال حساب نیاز ندارد.
        </p>
      )}
      <details className="rounded-lg bg-base-200 p-3">
        <summary className="cursor-pointer font-medium">
          دریافت صفحات از نقشهٔ سایت، سرچ کنسول یا وردپرس
        </summary>
        <div className="mt-3">
          <ClusterPageDiscovery
            projectId={projectId}
            onPages={() => {
              void pages.refetch();
            }}
          />
        </div>
      </details>
      {targetPage && (
        <Link
          className="btn btn-sm btn-outline"
          to="/p/$projectId/content"
          params={{ projectId }}
          search={{}}
        >
          بازگشت به پیش‌نویس عمومی
        </Link>
      )}
    </section>
  );
}
