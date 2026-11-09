import {
  suggestContentClusters,
  type ContentCluster,
} from "@/shared/contentClusters";

export function ClusterSuggestions({
  pages,
  clusters,
  disabled,
  onChoose,
}: {
  pages: { url: string; title: string }[];
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
  return (
    <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h2 className="text-lg font-bold">۲. گروه‌های پیشنهادی را بررسی کنید</h2>
      <p className="text-sm leading-7">
        پیلار، صفحهٔ اصلی یک موضوع است؛ کلاسترها به پرسش‌های جزئی‌تر همان موضوع
        پاسخ می‌دهند. پیشنهادهای زیر از واژه‌های مشترک عنوان‌ها ساخته شده‌اند؛
        انتخاب مرجع اصلی و ارتباط موضوعی نیاز به بررسی شما دارد.
      </p>
      {!pages.length ? (
        <p>ابتدا در مرحلهٔ ۱ صفحات سایت را دریافت کنید.</p>
      ) : !suggestions.length ? (
        <p>
          گروه تازه‌ای از عنوان‌ها پیدا نشد. از بخش «ساخت یا اصلاح دستی گروه»
          استفاده کنید یا صفحات بیشتری دریافت کنید.
        </p>
      ) : (
        suggestions.slice(0, 6).map((cluster) => (
          <article
            key={cluster.pillar.url}
            className="space-y-2 rounded-lg border border-base-300 bg-base-100 p-4"
          >
            <h3 className="font-semibold">
              مرجع پیشنهادی: {cluster.pillar.title}
            </h3>
            <p className="text-sm">
              {cluster.pages.length} زیرموضوع · دلیل: اشتراک واژه‌های عنوان؛
              مرجع از میان صفحات با بیشترین ارتباط عنوانی انتخاب شده است.
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
        کامل یا نتایج گوگل نیست؛ لینک‌های موجود سایت بررسی نشده‌اند.
      </p>
    </section>
  );
}
