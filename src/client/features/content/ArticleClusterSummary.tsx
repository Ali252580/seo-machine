import type { researchContentTarget } from "@/serverFunctions/contentResearch";

export function ArticleClusterSummary({
  evidence,
}: {
  evidence?: Awaited<ReturnType<typeof researchContentTarget>>;
}) {
  return (
    <section
      className="space-y-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4"
      aria-label="پیلار و کلاستر"
    >
      <h2 className="text-lg font-semibold">پیلار، کلاستر و لینک‌های داخلی</h2>
      <p className="text-sm leading-7">
        هر بار یک صفحه نوشته می‌شود. پیلار، مرجع اصلی موضوع است و به مقاله‌های
        جزئی‌تر لینک می‌دهد؛ کلاستر، یک زیرموضوع را پوشش می‌دهد و به مرجع و
        مقاله‌های مرتبط وصل می‌شود.
      </p>
      <p className="text-sm leading-7">
        SAM با مهارت keyword-clustering نقش پیشنهادی صفحه را بررسی می‌کند. هنوز
        نقشهٔ خوشه‌بندی تأییدشده یا انتخاب دستی نقش نداریم. لینک‌سازی در متن
        پیشنهادی انجام می‌شود؛ صفحات دیگر سایت خودکار ویرایش نمی‌شوند.
      </p>
      {!evidence ? (
        <p role="status">
          پس از «نگارش»، صفحات مرتبط با عنوان و کلمهٔ هدف در این بخش نمایش داده
          می‌شوند؛ این فهرست همهٔ صفحات سایت نیست.
        </p>
      ) : (
        <>
          <h3 className="font-medium">
            محتوای پیدا‌شده: {evidence.pages.length.toLocaleString("fa-IR")}{" "}
            مورد
          </h3>
          <p className="text-sm">
            حداکثر سه نامزد منتشرشده، در سقف طول درخواست، به SAM ارسال می‌شوند.
            وجود در این فهرست به معنی مرتبط‌بودن قطعی یا درج لینک در خروجی نیست.
          </p>
          {evidence.pages.length === 0 && (
            <p>
              {evidence.wordpressChecked
                ? "جست‌وجوی وردپرس نتیجه‌ای نداشت؛ مقصد لینک تأیید نشده است."
                : "وردپرس متصل نیست؛ فهرست مقالات موجود دریافت نشده است."}
            </p>
          )}
          <ul className="max-h-80 space-y-2 overflow-auto">
            {evidence.pages.map((page) => (
              <li
                key={`${page.kind}-${page.id}`}
                className="rounded-lg border border-base-300 bg-base-100 p-3"
              >
                <p className="font-medium">
                  {page.title.rendered || "بدون عنوان"}
                </p>
                <p className="mt-1 break-all text-xs" dir="ltr">
                  {page.link}
                </p>
                <p className="mt-2 text-xs">
                  {page.status === "publish"
                    ? "منتشرشده · قابل بررسی برای لینک داخلی"
                    : "منتشرنشده · فقط برای بررسی هم‌پوشانی موضوع"}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
