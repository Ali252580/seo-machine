import type { researchContentTarget } from "@/serverFunctions/contentResearch";
import { Liveline } from "liveline";

type Evidence = Awaited<ReturnType<typeof researchContentTarget>>;

export function ArticleResearchSummary({ evidence }: { evidence: Evidence }) {
  const leadingQuery =
    evidence.searchConsole.status === "connected"
      ? [...evidence.searchConsole.rows].sort(
          (a, b) => b.impressions - a.impressions,
        )[0]
      : undefined;
  const rankRows =
    evidence.rankTracking.status === "connected"
      ? evidence.rankTracking.rows
      : [];
  const decliningRank = rankRows.find(
    (row) =>
      row.position !== null &&
      row.previousPosition !== null &&
      row.position - row.previousPosition >= 3,
  );
  const landingPage =
    evidence.analytics.status === "connected"
      ? evidence.analytics.rows.find((row) => row.ga4)
      : undefined;
  const recommendation = evidence.existingPage
    ? "پیش‌نویس بهبود همان صفحه"
    : evidence.pages.length > 0
      ? "ابتدا محتوای موجود را بررسی و به‌روزرسانی کنید"
      : evidence.wordpressChecked
        ? "پیش‌نویس تازه، پس از بررسی هم‌پوشانی موضوع"
        : "هنوز نمی‌توان دربارهٔ مقالهٔ تازه تصمیم قطعی گرفت";
  const trend =
    evidence.searchConsole.status === "connected"
      ? evidence.searchConsole.trendRows
          .map((row) => ({
            time: Date.parse(`${row.keys?.[0]}T00:00:00Z`) / 1_000,
            value: row.clicks,
          }))
          .filter((point) => Number.isFinite(point.time))
          .sort((a, b) => a.time - b.time)
      : [];
  return (
    <section
      className="space-y-4 rounded-lg border border-base-300 bg-base-200/50 p-4 text-sm"
      aria-label="دلیل پیشنهاد محتوا"
    >
      <div>
        <p className="text-xs font-medium text-base-content/60">
          نتیجهٔ بررسی پیش از نگارش
        </p>
        <h2 className="mt-1 text-base font-semibold">{recommendation}</h2>
        <p className="mt-1 text-base-content/70">
          این پیشنهاد بر پایهٔ داده‌های همین پروژه است؛ پیش از جایگزینی متن، هدف
          صفحه و درستی اطلاعات را تأیید کنید.
        </p>
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">چرا این مسیر پیشنهاد شد؟</h3>
        <ul className="list-inside list-disc space-y-1 text-base-content/80">
          {evidence.existingPage ? (
            <li>
              صفحهٔ انتخاب‌شده خوانده شد؛ پیش‌نویس برای بهبود همان نشانی است.
            </li>
          ) : evidence.pages.length > 0 ? (
            <li>
              جست‌وجوی عنوان و کلمهٔ هدف در وردپرس{" "}
              {evidence.pages.length.toLocaleString("fa-IR")} مورد مرتبط پیدا
              کرد. ساخت صفحهٔ دوم می‌تواند موضوع را تکراری کند.
            </li>
          ) : evidence.wordpressChecked ? (
            <li>
              جست‌وجوی عنوان و کلمهٔ هدف در وردپرس نتیجه‌ای نداشت؛ این بررسی به
              تنهایی نبود صفحهٔ هم‌موضوع را ثابت نمی‌کند.
            </li>
          ) : (
            <li>
              وردپرس متصل نیست؛ هنوز نمی‌دانیم صفحهٔ هم‌موضوعی وجود دارد یا نه.
            </li>
          )}
          {leadingQuery && (
            <li>
              سرچ کنسول برای «{leadingQuery.keys?.[0] ?? "عبارت مرتبط"}» در سه
              ماه گذشته {leadingQuery.impressions.toLocaleString("fa-IR")}{" "}
              نمایش، {leadingQuery.clicks.toLocaleString("fa-IR")} کلیک و
              میانگین جایگاه {leadingQuery.position.toFixed(1)} ثبت کرده است.
              این داده تقاضا و عملکرد صفحهٔ فعلی را نشان می‌دهد، نه نیاز قطعی به
              مقالهٔ تازه.
            </li>
          )}
          {leadingQuery &&
            leadingQuery.impressions >= 30 &&
            leadingQuery.position >= 4 &&
            leadingQuery.position <= 20 && (
              <li>
                این عبارت همین حالا صفحه‌ای را در نتایج نشان می‌دهد. پیش از ساخت
                مقالهٔ دیگر، عنوان، تیترها و پاسخ صفحهٔ موجود به نیاز جست‌وجوگر
                را بررسی کنید.
              </li>
            )}
          {leadingQuery &&
            leadingQuery.impressions >= 100 &&
            leadingQuery.ctr < 0.02 && (
              <li>
                نسبت کلیک به نمایش این عبارت کمتر از ۲٪ است؛ عنوان و توضیح
                نتیجهٔ جست‌وجو را بررسی کنید. این عدد به‌تنهایی کیفیت متن را
                مشخص نمی‌کند.
              </li>
            )}
          {decliningRank && (
            <li>
              ردیابی رتبه برای کلمهٔ هدف افت از جایگاه{" "}
              {decliningRank.previousPosition?.toLocaleString("fa-IR")} به{" "}
              {decliningRank.position?.toLocaleString("fa-IR")} را ثبت کرده است؛
              علت افت باید بررسی شود و ممکن است به متن مربوط نباشد.
            </li>
          )}
          {landingPage?.ga4 && (
            <li>
              آنالیتیکس برای صفحهٔ منطبق{" "}
              {landingPage.ga4.sessions.toLocaleString("fa-IR")} نشست ارگانیک و{" "}
              {landingPage.ga4.keyEvents.toLocaleString("fa-IR")} رویداد کلیدی
              ثبت کرده است؛ ارزش تجاری بهبود را با این نتیجه بسنجید.
            </li>
          )}
        </ul>
      </div>
      <div className="rounded-lg border border-base-300 bg-base-100 p-3">
        <h3 className="font-medium">SAM چگونه متن را آماده می‌کند؟</h3>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-base-content/75">
          <li>
            موضوع و صفحه‌های موجود را بررسی می‌کند تا محتوای تکراری نسازد.
          </li>
          <li>
            عبارت‌ها و عملکرد سرچ کنسول، آنالیتیکس و رتبهٔ ثبت‌شده را در صورت
            دسترسی می‌خواند.
          </li>
          <li>
            با راهنمای مهارت‌های seo-audit و keyword-research، قصد جست‌وجو و
            کمبودهای متن را ارزیابی می‌کند.
          </li>
          <li>
            پیش‌نویس قابل ویرایش می‌نویسد؛ انتشار یا بازنویسی صفحهٔ زنده خودکار
            نیست.
          </li>
        </ol>
      </div>
      <h3 className="font-medium">جزئیات منابع</h3>
      <p>
        وردپرس: {evidence.wordpressChecked ? "بررسی شد" : "متصل نیست"}؛{" "}
        {evidence.pages.length.toLocaleString("fa-IR")} محتوای مرتبط
      </p>
      {evidence.existingPage && (
        <p>
          صفحهٔ هدف خوانده شد:{" "}
          {evidence.existingPage.title ?? evidence.existingPage.url}
        </p>
      )}
      <p>
        سرچ کنسول:{" "}
        {evidence.searchConsole.status === "connected"
          ? `${evidence.searchConsole.rows.length.toLocaleString("fa-IR")} عبارت/صفحهٔ شامل کلمهٔ هدف در سه ماه گذشته`
          : evidence.searchConsole.status === "not_connected"
            ? "متصل نیست"
            : "دریافت داده ناموفق بود"}
      </p>
      {evidence.searchConsole.status === "connected" &&
        evidence.searchConsole.rows.length > 0 && (
          <ul className="space-y-1 text-xs text-base-content/70">
            {[...evidence.searchConsole.rows]
              .sort((a, b) => b.impressions - a.impressions)
              .slice(0, 3)
              .map((row, index) => (
                <li key={`${row.keys?.join(":") ?? "row"}-${index}`}>
                  «{row.keys?.[0] ?? "عبارت نامشخص"}»:{" "}
                  {row.impressions.toLocaleString("fa-IR")} نمایش،{" "}
                  {row.clicks.toLocaleString("fa-IR")} کلیک، جایگاه{" "}
                  {row.position.toFixed(1)}
                </li>
              ))}
          </ul>
        )}
      <p>
        ردیابی رتبه:{" "}
        {evidence.rankTracking.status === "connected"
          ? `${rankRows.length.toLocaleString("fa-IR")} نتیجهٔ تازه برای کلمهٔ هدف`
          : evidence.rankTracking.status === "not_tracked"
            ? "برای این کلمه نتیجهٔ تازه‌ای ثبت نشده"
            : "دریافت داده ناموفق بود"}
      </p>
      {rankRows.slice(0, 3).map((row, index) => (
        <p
          key={`${row.device}-${row.location ?? ""}-${index}`}
          className="text-xs text-base-content/70"
        >
          {row.device === "mobile" ? "موبایل" : "دسکتاپ"}
          {row.location ? `، ${row.location}` : ""}: جایگاه{" "}
          {row.position?.toLocaleString("fa-IR") ?? "نامشخص"}
          {row.previousPosition !== null
            ? ` (رتبهٔ مرجع مقایسه: ${row.previousPosition.toLocaleString("fa-IR")})`
            : ""}
        </p>
      ))}
      {trend.length > 1 && (
        <div className="mt-3 rounded-lg border border-base-300 bg-base-100 p-3">
          <p className="font-medium">
            روند کلیک کلمه یا صفحهٔ هدف در ۲۸ روز گذشته
          </p>
          <div
            className="mt-2 h-36"
            role="img"
            aria-label="نمودار کلیک‌های روزانه سرچ کنسول برای موضوع این مقاله"
          >
            <Liveline
              data={trend}
              value={trend.at(-1)?.value ?? 0}
              window={31 * 24 * 60 * 60}
              theme="light"
              color="#315ba8"
              badge={false}
              formatValue={(value) => Math.round(value).toLocaleString("fa-IR")}
              formatTime={(time) =>
                new Date(time * 1_000).toLocaleDateString("fa-IR")
              }
            />
          </div>
          <p className="mt-1 text-xs text-base-content/60">
            فقط روزهای گزارش‌شده نمایش داده شده‌اند؛ فاصله‌ها به معنی صفر بودن
            کلیک نیست.
          </p>
        </div>
      )}
      <p>
        آنالیتیکس:{" "}
        {evidence.analytics.status === "connected"
          ? `${evidence.analytics.rows.length.toLocaleString("fa-IR")} صفحهٔ دارای دادهٔ منطبق${evidence.analytics.limited ? "؛ داده محدود است" : ""}`
          : evidence.analytics.status === "not_connected"
            ? "متصل نیست"
            : "دریافت داده ناموفق بود"}
      </p>
      <p className="mt-1 text-xs text-base-content/60">
        دادهٔ کم یا ناموجود، نبود تقاضا یا کیفیت پایین را ثابت نمی‌کند. اجرای
        واقعی مهارت‌ها در این خلاصه ثبت نمی‌شود؛ این بخش شواهدی را نشان می‌دهد
        که پیش از درخواست نگارش به SAM داده شده‌اند.
      </p>
    </section>
  );
}
