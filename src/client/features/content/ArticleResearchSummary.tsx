import type { researchContentTarget } from "@/serverFunctions/contentResearch";

type Evidence = Awaited<ReturnType<typeof researchContentTarget>>;

export function ArticleResearchSummary({ evidence }: { evidence: Evidence }) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-200/50 p-3 text-sm">
      <p className="font-medium">شواهد بررسی‌شده پیش از نگارش</p>
      <p>
        وردپرس: {evidence.wordpressChecked ? "بررسی شد" : "متصل نیست"}؛{" "}
        {evidence.pages.length} محتوای مرتبط
      </p>
      <p>
        سرچ کنسول:{" "}
        {evidence.searchConsole.status === "connected"
          ? `${evidence.searchConsole.rows.length} عبارت/صفحهٔ شامل کلمهٔ هدف در سه ماه گذشته`
          : "داده در دسترس نیست"}
      </p>
      <p>
        آنالیتیکس:{" "}
        {evidence.analytics.status === "connected"
          ? `${evidence.analytics.rows.length} صفحهٔ دارای دادهٔ منطبق${evidence.analytics.limited ? "؛ داده محدود است" : ""}`
          : "داده در دسترس نیست"}
      </p>
      <p className="mt-1 text-xs text-base-content/60">
        دادهٔ کم، نبود تقاضا یا کیفیت پایین را ثابت نمی‌کند. پیش از استفاده از
        متن، ارزش افزوده و واقعیت ادعاها را بازبینی کنید.
      </p>
    </div>
  );
}
