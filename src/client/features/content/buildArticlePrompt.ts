import type { researchContentTarget } from "@/serverFunctions/contentResearch";
import { sort } from "remeda";

type Evidence = Awaited<ReturnType<typeof researchContentTarget>>;

/** Keep observed facts separate from the writing instructions sent to SAM. */
export function buildArticlePrompt(
  keyword: string,
  title: string,
  evidence: Evidence,
) {
  const searchRows =
    evidence.searchConsole.status === "connected"
      ? sort(
          evidence.searchConsole.rows,
          (a, b) => b.impressions - a.impressions,
        )
          .slice(0, 5)
          .map(
            (row) =>
              `${row.keys?.[0] ?? "?"} → ${row.keys?.[1] ?? "?"}: ${row.impressions} نمایش، ${row.clicks} کلیک، جایگاه ${row.position.toFixed(1)}`,
          )
          .join("؛ ") || "عبارت مرتبطی ثبت نشده"
      : `داده در دسترس نیست (${evidence.searchConsole.status})`;
  const searchTrend =
    evidence.searchConsole.status === "connected" &&
    evidence.searchConsole.trendRows.length > 0
      ? `۲۸ روز اخیر: ${evidence.searchConsole.trendRows.length} روز گزارش، ${evidence.searchConsole.trendRows.reduce((sum, row) => sum + row.clicks, 0)} کلیک و ${evidence.searchConsole.trendRows.reduce((sum, row) => sum + row.impressions, 0)} نمایش`
      : "روند روزانه در دسترس نیست";
  const analyticsRows =
    evidence.analytics.status === "connected"
      ? evidence.analytics.rows
          .slice(0, 5)
          .map(
            (row) =>
              `${row.page}: ${row.ga4?.sessions ?? "بدون داده"} نشست ارگانیک، ${row.ga4?.keyEvents ?? "بدون داده"} رویداد کلیدی${row.score === null ? "" : `، امتیاز فرصت ${row.score}`}`,
          )
          .join("؛ ") || "برای صفحهٔ هدف دادهٔ منطبق وجود ندارد"
      : `داده در دسترس نیست (${evidence.analytics.status})`;
  const rankRows =
    evidence.rankTracking.status === "connected"
      ? evidence.rankTracking.rows
          .slice(0, 3)
          .map(
            (row) =>
              `${row.device === "mobile" ? "موبایل" : "دسکتاپ"}${row.location ? `/${row.location}` : ""}: رتبه ${row.position ?? "نامشخص"}، رتبهٔ مرجع مقایسه ${row.previousPosition ?? "نامشخص"}، نشانی رتبه‌گرفته ${row.rankingUrl ?? "نامشخص"}`,
          )
          .join("؛ ")
      : `داده در دسترس نیست (${evidence.rankTracking.status})`;
  const cmsRows = evidence.wordpressChecked
    ? evidence.pages.length
      ? evidence.pages
          .slice(0, 3)
          .map(
            (page) => `${page.title.rendered} (${page.link}؛ ${page.status})`,
          )
          .join("؛ ")
      : "بررسی شد؛ نتیجه‌ای نداشت"
    : "وصل نیست؛ نبود محتوای مشابه تأیید نشده";
  // The server accepts at most 4,000 characters. Bound observed rows, never
  // the instructions at the end that prohibit unsupported claims and filler.
  const evidenceSummary =
    `وردپرس: ${cmsRows.slice(0, 250)}. سرچ کنسول: ${searchRows.slice(0, 400)}. ردیابی رتبه: ${rankRows.slice(0, 250)}. ${searchTrend.slice(0, 120)}. آنالیتیکس: ${analyticsRows.slice(0, 250)}.`.slice(
      0,
      1_400,
    );
  const intro = `برای کلمهٔ «${keyword}» و عنوان «${title}» یک متن دقیق و قابل ویرایش بنویس. شواهد واقعی پیش از نگارش: ${evidenceSummary} `;
  const pageIntro = evidence.existingPage
    ? `صفحهٔ موجود (${evidence.existingPage.url.slice(0, 400)})، عنوان: ${evidence.existingPage.title ?? "نامشخص"}، گزیدهٔ متن فعلی: `
    : "";
  const pageInstruction = evidence.existingPage
    ? "این متن را برای همان صفحه بازنویسی و تکمیل کن؛ صفحه یا مقالهٔ جدید پیشنهاد نده."
    : "اگر صفحهٔ مشابهی وجود دارد، فقط بهبود همان صفحه را پیشنهاد بده و متن تکراری نساز.";
  const instructions = ` ${pageInstruction} از مهارت‌های seo-audit و keyword-research برای سنجش قصد جست‌وجو و کیفیت صفحه استفاده کن. افت رتبه یا نمایش بالا به‌تنهایی دلیل بازنویسی نیست؛ علت را از شواهد بررسی کن. از نمونه‌های کوچک نتیجهٔ قطعی نگیر و عددی را نساز. متن باید به نیاز مشخص کاربر پاسخ بدهد و نسبت به محتوای موجود ارزش تازه داشته باشد؛ از ادعای بی‌منبع، قیمت ساختگی و پاراگراف‌های کلی پرهیز کن. اگر اطلاعات کافی برای متن مفید نیست، فقط یک توضیح کوتاه دربارهٔ اطلاعات لازم بده. فقط HTML ساده بده. فقط از h2، h3، p، ul، ol، li، strong، em و br بدون ویژگی استفاده کن؛ کدبلاک و Markdown نده.`;
  const pageText =
    evidence.existingPage?.text.slice(
      0,
      Math.max(
        0,
        3_900 - intro.length - pageIntro.length - instructions.length,
      ),
    ) ?? "";
  return `${intro}${pageIntro}${pageText}${instructions}`;
}
