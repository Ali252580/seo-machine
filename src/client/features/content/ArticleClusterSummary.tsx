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
      {evidence?.internalLinks && (
        <div className="space-y-2 rounded-lg bg-base-100 p-3">
          <h3 className="font-medium">لینک‌های داخلی از صفحات شناسایی‌شده</h3>
          <p className="text-xs leading-6 text-base-content/70">
            امتیاز اولویت از ۱۰۰: ارتباط عنوان تا ۴۰، عضویت در نقشه ۲۰،
            مقاله‌بودن ۱۰ و فرصت رتبه تا ۳۰ امتیاز. رتبهٔ میانگین ۴ تا ۲۰ اولویت
            تقویت بیشتری دارد؛ این امتیاز داخلی است و تضمین رشد رتبه نیست. مقصد
            اصلی نقشه در اولویت می‌ماند.
          </p>
          <p className="text-xs leading-6">
            {evidence.linkRankingStatus === "connected"
              ? "رتبه‌ها: دادهٔ نهایی ۲۸ روز گذشتهٔ سرچ کنسول؛ حداکثر ۵۰۰۰ صفحه. نبود داده به معنی رتبهٔ صفر نیست."
              : "دادهٔ رتبهٔ سرچ کنسول در دسترس نیست؛ اولویت فقط از ارتباط موضوعی و نقشه محاسبه شده است."}
          </p>
          <p className="text-sm">
            {evidence.discoveredPageCount} صفحه از فهرست قبلی و بررسی تازهٔ سایت
            بررسی شد. {evidence.internalLinks.length} مقصد مرتبط اکنون خوانده
            شد؛ درج لینک فقط در صورت ارتباط با متن انجام می‌شود.
          </p>
          {evidence.articleDiscoveryUnavailable && (
            <p role="status" className="text-sm text-warning">
              دریافت تازهٔ مقاله‌های سایت انجام نشد؛ از صفحات قبلی و نتایج
              وردپرس استفاده شد.
            </p>
          )}
          <ul className="space-y-2">
            {evidence.internalLinks.map((page) => (
              <li key={page.url}>
                {page.title}
                {page.linkScore !== undefined && (
                  <p className="text-xs text-primary">
                    امتیاز: {page.linkScore}/۱۰۰ ·{" "}
                    {page.position !== undefined
                      ? `رتبهٔ میانگین: ${page.position.toFixed(1)} · نمایش: ${page.impressions}`
                      : "بدون دادهٔ رتبه"}
                  </p>
                )}
                <span dir="ltr" className="block break-all text-xs">
                  {page.url}
                </span>
              </li>
            ))}
          </ul>
          {!evidence.internalLinks.length && (
            <p className="text-sm">
              مقصد مرتبط و قابل خواندن پیدا نشد؛ نشانی حدسی به مقاله اضافه
              نمی‌شود.
            </p>
          )}
        </div>
      )}
      <p className="text-sm leading-7">
        نقشه را از منوی «نقشهٔ پیلار و کلاستر» بسازید و ذخیره کنید. SAM در نگارش
        صفحهٔ انتخاب‌شده، مقصدهای همان نقشه را در اولویت قرار می‌دهد. صفحات دیگر
        سایت خودکار ویرایش نمی‌شوند.
      </p>
      {evidence?.clusterPlan && (
        <div className="rounded-lg bg-base-100 p-3">
          <h3 className="font-medium">
            نقش ذخیره‌شده:{" "}
            {evidence.clusterPlan.role === "pillar" ? "پیلار" : "کلاستر"}
          </h3>
          <ul className="mt-2 space-y-2">
            {evidence.clusterPlan.targets.map((page) => (
              <li key={page.url}>
                {page.title}
                <span dir="ltr" className="block break-all text-xs">
                  {page.url}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
            حداکثر پنج نامزد منتشرشده، در سقف طول درخواست، به SAM ارسال می‌شوند.
            وجود در این فهرست به معنی مرتبط‌بودن قطعی یا درج لینک در خروجی نیست.
          </p>
          {evidence.pages.length === 0 && (
            <p>
              {evidence.wordpressChecked
                ? "جست‌وجوی وردپرس نتیجه‌ای نداشت؛ مقصد لینک تأیید نشده است."
                : "وردپرس متصل نیست؛ مقصدهای منابع دیگر در بخش لینک‌های داخلی بالا بررسی می‌شوند."}
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
