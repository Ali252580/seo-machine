import { useState } from "react";
import {
  suggestContentClusters,
  type ContentCluster,
  type DiscoveredClusterPage,
} from "@/shared/contentClusters";

export function ClusterSuggestions({
  pages,
  clusters,
  disabled,
  onChoose,
}: {
  pages: DiscoveredClusterPage[];
  clusters: ContentCluster[];
  disabled: boolean;
  onChoose: (cluster: ContentCluster) => void;
}) {
  const [search, setSearch] = useState("");
  const used = new Set(
    clusters.flatMap((cluster) => [
      cluster.pillar.url,
      ...cluster.pages.map((page) => page.url),
    ]),
  );
  const available = pages.filter((page) => !used.has(page.url));
  const suggestions = suggestContentClusters(available).filter((cluster) =>
    [cluster.pillar, ...cluster.pages].some((page) =>
      `${page.title} ${page.url}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    ),
  );
  const categories = pages.filter((page) => page.kind === "category");
  const navigation = pages.filter((page) => page.kind === "navigation");
  return (
    <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h2 className="text-lg font-bold">۲. گروه‌های پیشنهادی را بررسی کنید</h2>
      <p className="text-sm leading-7">
        پیلار، صفحهٔ اصلی یک موضوع است؛ کلاسترها به پرسش‌های جزئی‌تر همان موضوع
        پاسخ می‌دهند. دسته‌بندی واقعی و عضویت مقاله‌ها بر شباهت عنوان اولویت
        دارند؛ انتخاب مرجع اصلی و ارتباط موضوعی نیاز به بررسی شما دارد.
      </p>
      <details className="rounded-lg border border-base-300 bg-base-100 p-4">
        <summary className="cursor-pointer font-semibold">
          دسته‌بندی‌ها و منوی سایت · {categories.length} دسته ·{" "}
          {navigation.length} صفحهٔ منو
        </summary>
        {!categories.length && (
          <p className="text-sm">
            هنوز دسته‌ای شناسایی نشده است. ممکن است سایت دسترسی عمومی را بسته
            باشد یا دسته‌ها در منابع خوانده‌شده نباشند؛ این به معنی نداشتن
            دسته‌بندی نیست.
          </p>
        )}
        <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
          {categories.map((page) => (
            <li key={page.url}>
              <a
                className="link"
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {page.title}
              </a>
              <span className="ms-2 text-xs">
                {page.categoryLevel === "root"
                  ? "دستهٔ اصلی"
                  : page.parentUrl || page.categoryLevel === "child"
                    ? "زیر‌دسته"
                    : "دسته؛ سطح والد ممکن است مشخص نباشد"}{" "}
                ·{" "}
                {
                  pages.filter((item) => item.categoryUrls?.includes(page.url))
                    .length
                }{" "}
                مقالهٔ مرتبط شناسایی‌شده
              </span>
            </li>
          ))}
        </ul>
        {navigation.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer">
              صفحات منوی سایت · {navigation.length} (دسته‌بندی تأییدشده نیستند)
            </summary>
            <ul>
              {navigation.map((page) => (
                <li key={page.url} className="break-words">
                  <a
                    className="link"
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </details>
      <label className="block space-y-2">
        <span>جست‌وجوی گروه با عنوان مقاله یا صفحه</span>
        <input
          className="input input-bordered w-full"
          placeholder="مثلاً نگهداری روف گاردن"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <p className="text-sm">
        {suggestions.length} گروه پیشنهادی ·{" "}
        {pages.filter((page) => page.kind === "article").length} مقالهٔ
        شناسایی‌شده. برای دیدن مقصدهای لینک، هر گروه را باز کنید.
      </p>
      {!pages.length ? (
        <p>ابتدا در مرحلهٔ ۱ صفحات سایت را دریافت کنید.</p>
      ) : !suggestions.length ? (
        <p>
          گروه تازه‌ای از عنوان‌ها پیدا نشد. از بخش «ساخت یا اصلاح دستی گروه»
          استفاده کنید یا صفحات بیشتری دریافت کنید.
        </p>
      ) : (
        suggestions.map((cluster) => (
          <details
            key={cluster.pillar.url}
            className="space-y-2 rounded-lg border border-base-300 bg-base-100 p-4"
          >
            <summary className="cursor-pointer break-words font-semibold">
              {cluster.pillar.title}
              <span className="ms-2 text-sm font-normal text-base-content/60">
                {cluster.pages.length} مقصد پیشنهادی لینک
              </span>
            </summary>
            <p className="text-sm">
              {cluster.pages.length} زیرموضوع ·{" "}
              {categories.some((page) => page.url === cluster.pillar.url)
                ? "دلیل: عضویت در دسته و شباهت عنوان مقاله‌ها؛ دسته فقط نامزد پیلار است."
                : "دلیل: شباهت عنوان‌ها؛ نیازمند بررسی موضوع و قصد جست‌وجو."}
            </p>
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {cluster.pages.map((page) => (
                <li key={page.url} className="break-words">
                  <a
                    className="link"
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
            <button
              className="btn btn-primary btn-sm"
              disabled={disabled}
              onClick={() => onChoose(cluster)}
            >
              بررسی و اصلاح این گروه
            </button>
          </details>
        ))
      )}
      <p className="text-xs text-base-content/60">
        {available.length} صفحه خارج از گروه‌های فعلی. این پیشنهاد تحلیل محتوای
        کامل یا نتایج گوگل نیست؛ ارتباط از دسته‌بندی و عنوان‌ها پیشنهاد شده و
        هنوز روی سایت اجرا نشده است.
      </p>
    </section>
  );
}
