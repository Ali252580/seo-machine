export function ArticlePreview({
  content,
  keyword,
  title,
  articleText,
  wordCount,
}: {
  content: string;
  keyword: string;
  title: string;
  articleText: string;
  wordCount: number;
}) {
  return (
    <section className="rounded-xl border border-base-300 p-4">
      <h2 className="mb-3 font-medium">پیش‌نمایش مقاله</h2>
      <div className="mb-4 grid gap-1 rounded-lg bg-base-200 p-3 text-xs text-base-content/70">
        <span>{wordCount.toLocaleString("fa-IR")} واژه</span>
        <span>
          {keyword && title.includes(keyword)
            ? "✓ کلمهٔ هدف در عنوان است"
            : "کلمهٔ هدف را در عنوان بررسی کنید"}
        </span>
        <span>
          {keyword && articleText.includes(keyword)
            ? "✓ کلمهٔ هدف در متن است"
            : "ارتباط متن با کلمهٔ هدف را بررسی کنید"}
        </span>
        <span>
          {/<h2>/i.test(content)
            ? "✓ متن دارای تیتر بخش است"
            : "برای بخش‌های مقاله تیتر بگذارید"}
        </span>
      </div>
      <iframe
        title="پیش‌نمایش مقاله"
        sandbox=""
        className="min-h-[650px] w-full rounded-lg border border-base-300 bg-white"
        srcDoc={`<html lang="fa" dir="rtl"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font:16px/2 sans-serif;padding:24px;color:#17222f}h2,h3{line-height:1.5}</style>${content}</html>`}
      />
    </section>
  );
}
