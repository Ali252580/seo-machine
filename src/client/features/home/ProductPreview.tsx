import { useState } from "react";
import { BarChart3, Sparkles } from "lucide-react";
const previews = {
  research: {
    label: "تحقیق کلمات",
    heading: "از یک موضوع، به یک برنامهٔ محتوا",
    columns: ["کلمهٔ کلیدی", "قصد جست‌وجو", "اقدام پیشنهادی"],
    rows: [
      ["طراحی روف گاردن", "بررسی خدمات", "صفحهٔ خدمات"],
      ["هزینه ساخت روف گاردن", "بررسی قیمت", "راهنمای هزینه"],
      ["گیاهان مناسب روف گاردن", "آموزشی", "مقالهٔ راهنما"],
    ],
    note: "کلمات مرتبط را بر اساس نیاز مخاطب دسته‌بندی کنید.",
  },
  rank: {
    label: "ردیابی رتبه",
    heading: "روند دیده‌شدن صفحات را دنبال کنید",
    columns: ["کلمهٔ کلیدی", "رتبهٔ قبلی", "رتبهٔ فعلی"],
    rows: [
      ["طراحی روف گاردن", "۱۲", "۸"],
      ["هزینه ساخت روف گاردن", "۹", "۶"],
      ["گیاهان مناسب روف گاردن", "۱۸", "۱۴"],
    ],
    note: "نمونهٔ مقایسهٔ دو بررسی با کشور و دستگاه یکسان.",
  },
  ai: {
    label: "تحلیل هوشمند",
    heading: "داده‌ها را به قدم بعدی تبدیل کنید",
    columns: ["فرصت محتوایی", "پیشنهاد", "مرحلهٔ بعد"],
    rows: [
      ["پرسش‌های مربوط به هزینه", "راهنمای قیمت", "تعیین سرفصل‌ها"],
      ["انتخاب گیاه مناسب", "مقایسهٔ گزینه‌ها", "جمع‌آوری منابع"],
      ["نگهداری در زمستان", "مقالهٔ فصلی", "بازبینی متخصص"],
    ],
    note: "نمونهٔ پیشنهاد هوش مصنوعی؛ نیازمند بررسی و تأیید شما.",
  },
} as const;

/** Marketing-only sample: never queries or writes a customer's project data. */
export function ProductPreview() {
  const [active, setActive] = useState<keyof typeof previews>("research");
  const preview = previews[active];
  return (
    <div className="seo-preview">
      <div className="seo-preview-bar">
        <span>
          <span className="seo-live-dot" /> فضای کاری من
        </span>
        <span className="seo-example">پیش‌نمایش · دادهٔ نمونه</span>
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
            {previews[key].label}
          </button>
        ))}
      </div>
      <div className="seo-preview-body" aria-live="polite">
        <div className="seo-preview-title">
          <div>
            <small>پروژهٔ نمونه / فضای سبز</small>
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
                <stop offset="0%" stopColor="#ec6a42" stopOpacity=".22" />
                <stop offset="100%" stopColor="#ec6a42" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 130 C40 125 45 95 80 108 S140 85 175 93 S215 57 250 70 S310 30 355 48 S410 35 445 40 S530 10 600 12 L600 150 L0 150 Z"
              fill="url(#seo-home-chart-fill)"
            />
            <path
              d="M0 130 C40 125 45 95 80 108 S140 85 175 93 S215 57 250 70 S310 30 355 48 S410 35 445 40 S530 10 600 12"
              fill="none"
              stroke="#dc542f"
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
