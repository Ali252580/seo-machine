import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Hand,
  Sparkles,
  Search,
  TrendingUp,
} from "lucide-react";
const previews = {
  research: {
    label: "تحقیق کلمات کلیدی",
    heading: "از یک موضوع، به یک برنامهٔ محتوا",
    columns: ["کلمهٔ کلیدی", "قصد جست‌وجو", "اقدام پیشنهادی"],
    rows: [
      ["آموزش سئو سایت", "آموزشی", "راهنمای جامع"],
      ["تحقیق کلمات کلیدی", "آموزشی", "آموزش مرحله‌ای"],
      ["بررسی رتبه کلمات کلیدی", "آموزشی", "راهنمای ابزارها"],
    ],
    note: "کلمات مرتبط را بر اساس نیاز مخاطب دسته‌بندی کنید.",
  },
  rank: {
    label: "ردیابی رتبه",
    heading: "روند دیده‌شدن صفحات را دنبال کنید",
    columns: ["کلمهٔ کلیدی", "رتبهٔ قبلی", "رتبهٔ فعلی"],
    rows: [
      ["آموزش سئو سایت", "۱۲", "۸"],
      ["تحقیق کلمات کلیدی", "۹", "۶"],
      ["بررسی رتبه کلمات کلیدی", "۱۸", "۱۴"],
    ],
    note: "نمونهٔ مقایسهٔ دو بررسی با کشور و دستگاه یکسان.",
  },
  ai: {
    label: "عامل هوشمند SAM",
    heading: "داده‌ها را به قدم بعدی تبدیل کنید",
    columns: ["فرصت محتوایی", "پیشنهاد", "مرحلهٔ بعد"],
    rows: [
      ["پرسش‌های سئو فنی", "چک‌لیست فنی", "تعیین سرفصل‌ها"],
      ["انتخاب کلمهٔ مناسب", "مقایسهٔ قصد جست‌وجو", "جمع‌آوری منابع"],
      ["افت رتبهٔ صفحه", "بازبینی محتوا", "بازبینی متخصص"],
    ],
    note: "نمونهٔ پیشنهاد هوش مصنوعی؛ نیازمند بررسی و تأیید شما.",
  },
} as const;

/** Marketing-only sample: never queries or writes a customer's project data. */
export function ProductPreview() {
  const [active, setActive] = useState<keyof typeof previews>("research");
  const preview = previews[active];
  const steps = Object.keys(previews) as Array<keyof typeof previews>;
  const step = steps.indexOf(active);
  const next = steps[(step + 1) % steps.length];
  return (
    <div className="seo-preview">
      <div className="seo-preview-bar">
        <span>
          <strong dir="ltr">OpenSEO</strong>
          <span aria-hidden="true">/</span> پروژهٔ آموزش سئو
        </span>
        <span className="seo-example">پیش‌نمایش · دادهٔ نمونه</span>
      </div>
      <div className="seo-preview-guide">
        <Hand size={17} aria-hidden="true" />
        <span>این پیش‌نمایش تعاملی است؛ روی هر تب کلیک کنید.</span>
      </div>
      <div
        className="seo-preview-tabs"
        role="group"
        aria-label="انتخاب پیش‌نمایش ابزار"
      >
        {(Object.keys(previews) as Array<keyof typeof previews>).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            {key === "research" ? (
              <Search size={15} />
            ) : key === "rank" ? (
              <TrendingUp size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            {previews[key].label}
          </button>
        ))}
      </div>
      <div className="seo-preview-next">
        <span>نمایش {new Intl.NumberFormat("fa").format(step + 1)} از ۳</span>
        <button type="button" onClick={() => setActive(next)}>
          {step === steps.length - 1 ? "بازگشت به" : "بعدی:"}{" "}
          {previews[next].label}
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="seo-preview-body" aria-live="polite">
        <div className="seo-preview-title">
          <div>
            <small>پروژهٔ نمونه / آموزش سئو</small>
            <h3>{preview.heading}</h3>
          </div>
          <BarChart3 size={22} />
        </div>
        <div
          className="seo-chart"
          aria-label="نمودار نمایشی روند رشد؛ دادهٔ واقعی نیست"
          role="img"
        >
          <div className="seo-chart-label">
            <span>روند نمایش در جست‌وجو</span>
            <b>۲۸ روز نمونه</b>
          </div>
          <svg
            viewBox="0 0 600 150"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="seo-home-chart-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--seo-accent)"
                  stopOpacity=".22"
                />
                <stop
                  offset="100%"
                  stopColor="var(--seo-accent)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d="M0 130 C40 125 45 95 80 108 S140 85 175 93 S215 57 250 70 S310 30 355 48 S410 35 445 40 S530 10 600 12 L600 150 L0 150 Z"
              fill="url(#seo-home-chart-fill)"
            />
            <path
              d="M0 130 C40 125 45 95 80 108 S140 85 175 93 S215 57 250 70 S310 30 355 48 S410 35 445 40 S530 10 600 12"
              fill="none"
              stroke="var(--seo-accent)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div className="seo-table-scroll">
          <table>
            <thead>
              <tr>
                {preview.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={cell}>
                      {index === 2 ? (
                        <span className="seo-table-tag">{cell}</span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="seo-preview-note">
          <Sparkles size={15} />
          {preview.note}
        </p>
      </div>
    </div>
  );
}
