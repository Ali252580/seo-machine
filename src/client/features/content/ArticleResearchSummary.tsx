import type { researchContentTarget } from "@/serverFunctions/contentResearch";

type Evidence = Awaited<ReturnType<typeof researchContentTarget>>;

export function ArticleResearchSummary({ evidence }: { evidence: Evidence }) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-200/50 p-3 text-sm">
      <p className="font-medium">شواهد بررسی‌شده پیش از نگارش</p>
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
      <p>
        آنالیتیکس:{" "}
        {evidence.analytics.status === "connected"
          ? `${evidence.analytics.rows.length.toLocaleString("fa-IR")} صفحهٔ دارای دادهٔ منطبق${evidence.analytics.limited ? "؛ داده محدود است" : ""}`
          : evidence.analytics.status === "not_connected"
            ? "متصل نیست"
            : "دریافت داده ناموفق بود"}
      </p>
      <p className="mt-1 text-xs text-base-content/60">
        دادهٔ کم، نبود تقاضا یا کیفیت پایین را ثابت نمی‌کند. پیش از استفاده از
        متن، ارزش افزوده و واقعیت ادعاها را بازبینی کنید.
      </p>
    </div>
  );
}
