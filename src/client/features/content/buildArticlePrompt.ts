import type { researchContentTarget } from "@/serverFunctions/contentResearch";
import { sort } from "remeda";

type Evidence = Awaited<ReturnType<typeof researchContentTarget>>;

/** Keep observed facts separate from the writing instructions sent to SAM. */
export function buildArticlePrompt(
  keyword: string,
  title: string,
  evidence: Evidence,
  kind: "page" | "post" = "page",
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
  const intro = `برای کلمهٔ «${keyword.slice(0, 100)}» و عنوان «${title.slice(0, 180)}» یک متن دقیق و قابل ویرایش بنویس. شواهد واقعی پیش از نگارش: `;
  const pageIntro = evidence.existingPage
    ? `صفحهٔ موجود (${evidence.existingPage.url.slice(0, 400)})، عنوان: ${evidence.existingPage.title?.slice(0, 180) ?? "نامشخص"}، گزیدهٔ متن فعلی: `
    : "";
  const pageInstruction = evidence.existingPage
    ? "این متن را برای همان صفحه بازنویسی و تکمیل کن؛ صفحه یا مقالهٔ جدید پیشنهاد نده."
    : "اگر صفحهٔ مشابهی وجود دارد، فقط بهبود همان صفحه را پیشنهاد بده و متن تکراری نساز.";
  const writingBrief =
    kind === "post"
      ? "این یک مقالهٔ وبلاگ برای سایت همین پروژه است. مخاطب، زبان و ترجیحات نگارش زمینهٔ پروژه را رعایت کن. مسئلهٔ مشخص خواننده و زاویهٔ مقاله را از موضوع و شواهد تعیین کن؛ موضوع نامرتبط با سایت را ننویس. هدف، فهم موضوع و انجام یک اقدام آگاهانه است، نه معرفی خدمات. در شروع، پاسخ اصلی و محدودهٔ بحث را در دو تا سه جمله بده؛ مقدمهٔ کلی مثل «در دنیای امروز» ننویس. ساختار را متناسب با نیاز انتخاب کن: آموزش با مراحل و نتیجهٔ قابل بررسی، مقایسه با معیارها و محدودیت‌ها، یا عیب‌یابی با نشانه، علت و اقدام ایمن. تیترهای h2 و h3 باید پرسش‌های متفاوت خواننده را پاسخ دهند؛ هر بخش نکتهٔ تازه داشته باشد. مثال روشن یا چک‌لیست عملی اضافه کن؛ مثال فرضی را فرضی بنام. اشتباهات رایج و زمان نیاز به متخصص را فقط اگر مرتبط است توضیح بده. پایان، جمع‌بندی کوتاه و اقدام بعدی متناسب با آموخته‌ها باشد؛ فراخوان فروش و بخش «چرا ما» نگذار. پرسش متداول فقط برای سؤال بی‌پاسخ، نه تکرار متن. طول متن تابع پوشش نیاز است؛ برای رسیدن به تعداد کلمه کش نده. کلیدواژه و مترادف‌ها طبیعی باشند. نام برند، شهر و لینک یا منبع را نساز؛ نقل‌قول، تجربه و آمار نیاز به شاهد دارند."
      : "برای صفحهٔ سایت بنویس و هدف و ساختار مفید صفحهٔ موجود را حفظ کن. اگر صفحه خدمات است، به تصمیم مشتری کمک کن: خدمت برای چه کسی مناسب است، دامنه و محدودیت خدمت چیست، فرایند انجام و اقدام بعدی چیست. فقط خدمات، منطقهٔ پوشش، مزیت‌ها، شواهد اعتماد و روش تماس تأییدشده در زمینهٔ همین پروژه را بیاور. قیمت، ضمانت، سابقه و رضایت مشتری نساز. آموزش طولانی وبلاگی را جای معرفی روشن خدمت ننشان. اگر صفحهٔ موجود آموزشی است، همان قصد آموزشی را حفظ کن و آن را به صفحهٔ فروش تبدیل نکن.";
  const instructions = ` ${writingBrief} ${pageInstruction} از مهارت‌های seo-audit و keyword-research برای سنجش قصد جست‌وجو و کیفیت صفحه استفاده کن. افت رتبه یا نمایش بالا به‌تنهایی دلیل بازنویسی نیست؛ علت را از شواهد بررسی کن. از نمونه‌های کوچک نتیجهٔ قطعی نگیر و عددی را نساز. متن باید به نیاز مشخص کاربر پاسخ بدهد و نسبت به محتوای موجود ارزش تازه داشته باشد؛ از ادعای بی‌منبع، قیمت ساختگی و پاراگراف‌های کلی پرهیز کن. اگر اطلاعات کافی برای متن مفید نیست، فقط یک توضیح کوتاه دربارهٔ اطلاعات لازم بده. فقط HTML ساده بده. فقط از h2، h3، p، ul، ol، li، strong، em و br بدون ویژگی استفاده کن؛ کدبلاک و Markdown نده.`;
  // Reserve space for the original page while keeping all writing safeguards intact.
  const available = Math.max(
    0,
    3_900 - intro.length - pageIntro.length - instructions.length,
  );
  const observed = evidenceSummary.slice(
    0,
    Math.max(0, available - (evidence.existingPage ? 600 : 0)),
  );
  const pageText =
    evidence.existingPage?.text.slice(
      0,
      Math.max(0, available - observed.length),
    ) ?? "";
  return `${intro}${observed}${pageIntro}${pageText}${instructions}`;
}
