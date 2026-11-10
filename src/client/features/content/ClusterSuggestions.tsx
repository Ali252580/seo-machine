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
  const used = new Set(
    clusters.flatMap((cluster) => [
      cluster.pillar.url,
      ...cluster.pages.map((page) => page.url),
    ]),
  );
  const available = pages.filter((page) => !used.has(page.url));
  const suggestions = suggestContentClusters(available);
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
      <div className="rounded-lg border border-base-300 bg-base-100 p-4">
        <h3 className="font-semibold">
          دسته‌بندی‌های شناسایی‌شده · {categories.length}
        </h3>
        {!categories.length && (
          <p className="text-sm">
            هنوز دسته‌ای شناسایی نشده است. ممکن است سایت دسترسی عمومی را بسته
            باشد یا دسته‌ها در منابع خوانده‌شده نباشند؛ این به معنی نداشتن
            دسته‌بندی نیست.
          </p>
        )}
        <ul className="mt-2 space-y-2">
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
                <li key={page.url}>{page.title}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {!pages.length ? (
        <p>ابتدا در مرحلهٔ ۱ صفحات سایت را دریافت کنید.</p>
      ) : !suggestions.length ? (
        <p>
          گروه تازه‌ای از عنوان‌ها پیدا نشد. از بخش «ساخت یا اصلاح دستی گروه»
          استفاده کنید یا صفحات بیشتری دریافت کنید.
        </p>
      ) : (
        suggestions.map((cluster) => (
          <article
            key={cluster.pillar.url}
            className="space-y-2 rounded-lg border border-base-300 bg-base-100 p-4"
          >
            <h3 className="font-semibold">
              مرجع پیشنهادی: {cluster.pillar.title}
            </h3>
            <p className="text-sm">
              {cluster.pages.length} زیرموضوع ·{" "}
              {categories.some((page) => page.url === cluster.pillar.url)
                ? "دلیل: عضویت در دسته یا پیوند مقاله در صفحهٔ آرشیو؛ این دسته نامزد مرجع است، نه پیلار قطعی."
                : "دلیل: شباهت عنوان‌ها؛ نیازمند بررسی موضوع و قصد جست‌وجو."}
            </p>
            <ul className="list-inside list-disc text-sm">
              {cluster.pages.map((page) => (
                <li key={page.url}>{page.title}</li>
              ))}
            </ul>
            <button
              className="btn btn-primary btn-sm"
              disabled={disabled}
              onClick={() => onChoose(cluster)}
            >
              بررسی و اصلاح این گروه
            </button>
          </article>
        ))
      )}
      <p className="text-xs text-base-content/60">
        {available.length} صفحه خارج از گروه‌های فعلی. این پیشنهاد تحلیل محتوای
        کامل یا نتایج گوگل نیست؛ فقط ارتباطات دسته‌بندی بررسی شده‌اند، نه تمام
        لینک‌های داخلی سایت.
      </p>
    </section>
  );
}
