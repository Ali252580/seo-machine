import type { researchContentTarget } from "@/serverFunctions/contentResearch";
import { Liveline } from "liveline";

type Evidence = Awaited<ReturnType<typeof researchContentTarget>>;

export function ArticleResearchSummary({ evidence }: { evidence: Evidence }) {
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
        دادهٔ کم، نبود تقاضا یا کیفیت پایین را ثابت نمی‌کند. پیش از استفاده از
        متن، ارزش افزوده و واقعیت ادعاها را بازبینی کنید.
      </p>
    </div>
  );
}
