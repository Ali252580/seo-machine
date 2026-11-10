import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  Search,
  Download,
} from "lucide-react";
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
      className="overflow-hidden rounded-xl border border-base-300 bg-base-100"
      aria-label="انتخاب صفحه برای نگارش"
      dir="rtl"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-lg font-bold sm:text-xl">
            صفحات سایت برای نگارش و بهبود
          </h2>
          <p className="text-sm leading-7 text-base-content/75">
            صفحهٔ موردنظر را پیدا کنید و با SAM بهبود دهید. برای هر صفحه، یک
            پیش‌نویس مستقل نگه داشته می‌شود.
          </p>
        </div>
        {pages.data && (
          <span className="badge badge-outline h-auto shrink-0 gap-2 border-base-300 px-3 py-2 text-xs">
            <FileText size={15} aria-hidden="true" />
            {pages.data.length.toLocaleString("fa-IR")} صفحهٔ شناسایی‌شده
          </span>
        )}
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-base-300 bg-base-200/60 px-5 py-4 sm:px-6">
        <label className="input input-bordered flex h-11 w-full items-center gap-2 bg-base-100 sm:max-w-md">
          <Search
            size={18}
            className="shrink-0 text-base-content/70"
            aria-hidden="true"
          />
          <input
            className="min-w-0 grow text-sm"
            type="search"
            aria-label="جست‌وجوی صفحات سایت"
            placeholder="جست‌وجوی عنوان یا نشانی"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {pages.data && (
          <p role="status" className="text-xs text-base-content/75">
            نمایش {filtered.length.toLocaleString("fa-IR")} از{" "}
            {pages.data.length.toLocaleString("fa-IR")} صفحه
          </p>
        )}
      </div>
      {pages.isPending && (
        <div
          role="status"
          className="flex items-center justify-center gap-3 p-10 text-sm"
        >
          <span
            className="loading loading-spinner loading-sm"
            aria-hidden="true"
          />
          در حال دریافت صفحات…
        </div>
      )}
      {pages.error && (
        <div
          role="alert"
          className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/40 bg-error/5 p-4 text-sm"
        >
          <p>{getStandardErrorMessage(pages.error)} </p>
          <button className="btn btn-sm" onClick={() => void pages.refetch()}>
            تلاش مجدد
          </button>
        </div>
      )}
      {filtered.length > 0 && (
        <div
          className="hidden items-center justify-between border-b border-base-300 px-6 py-3 text-xs font-medium text-base-content/70 sm:flex"
          aria-hidden="true"
        >
          <span>عنوان و نشانی صفحه</span>
          <span>نگارش و بهبود</span>
        </div>
      )}
      <ul className="max-h-[32rem] divide-y divide-base-300 overflow-y-auto">
        {filtered.map((page) => (
          <li key={page.url}>
            <Link
              className={`group flex min-w-0 flex-col gap-3 px-5 py-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-5 sm:px-6 ${targetPage === page.url ? "bg-primary/5" : "hover:bg-base-200/70"}`}
              to="/p/$projectId/content"
              params={{ projectId }}
              search={{ page: page.url, title: page.title.slice(0, 180) }}
              aria-current={targetPage === page.url ? "page" : undefined}
            >
              <FileText
                size={20}
                aria-hidden="true"
                className="hidden shrink-0 text-base-content/60 sm:block"
              />
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block break-words text-sm font-semibold leading-7">
                  {page.title}
                </span>
                <span
                  dir="ltr"
                  className="block truncate text-right text-xs leading-6 text-base-content/70"
                  title={page.url}
                >
                  {page.url}
                </span>
              </span>
              <span
                className={`flex shrink-0 items-center gap-2 self-start text-xs font-medium sm:self-center ${targetPage === page.url ? "text-primary" : "rounded-lg border border-base-300 px-3 py-2.5 text-base-content group-hover:border-primary group-hover:text-primary"}`}
              >
                {targetPage === page.url ? (
                  <>
                    <Check size={16} aria-hidden="true" />
                    صفحهٔ انتخاب‌شده
                  </>
                ) : (
                  <>
                    بهبود این صفحه
                    <ArrowLeft size={15} aria-hidden="true" />
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!pages.isPending && !pages.error && filtered.length === 0 && (
        <div className="space-y-3 px-6 py-10 text-center">
          <Search
            size={28}
            aria-hidden="true"
            className="mx-auto text-base-content/60"
          />
          <p className="font-semibold">
            {pages.data?.length
              ? "صفحه‌ای با این جست‌وجو پیدا نشد"
              : "هنوز صفحه‌ای ذخیره نشده است"}
          </p>
          <p className="mx-auto max-w-md text-sm leading-7 text-base-content/75">
            {pages.data?.length
              ? "عنوان دیگری یا بخشی از نشانی صفحه را جست‌وجو کنید."
              : "از بخش دریافت صفحات شروع کنید. نقشهٔ سایت به اتصال حساب نیاز ندارد."}
          </p>
          {!!pages.data?.length && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setSearch("")}
            >
              پاک‌کردن جست‌وجو
            </button>
          )}
        </div>
      )}
      <details className="group border-t border-base-300 bg-base-200/40">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-6 [&::-webkit-details-marker]:hidden">
          <Download
            size={18}
            className="shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              دریافت و تکمیل فهرست صفحات
            </span>
            <span className="mt-1 block text-xs leading-6 text-base-content/75">
              نقشهٔ سایت، سرچ کنسول یا وردپرس
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="shrink-0 group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-base-300 p-5 sm:p-6">
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
          className="btn btn-sm btn-ghost m-4"
          to="/p/$projectId/content"
          params={{ projectId }}
          search={{}}
        >
          بازگشت به پیشنهادها و پیش‌نویس‌ها
        </Link>
      )}
    </section>
  );
}
