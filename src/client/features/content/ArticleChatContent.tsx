import { useNavigate } from "@tanstack/react-router";
import {
  articleHtml,
  articlePreviewHtml,
  articleRequestSummary,
} from "./articleChatUtils";

export function ArticleRequest({ text }: { text: string }) {
  const summary = articleRequestSummary(text);
  if (!summary) return null;
  return (
    <div className="max-w-xl space-y-2 text-sm">
      <p className="font-semibold">درخواست نگارش مقاله</p>
      <p>کلمهٔ هدف: {summary.keyword}</p>
      <p>عنوان: {summary.title}</p>
      <details className="text-xs opacity-80">
        <summary className="cursor-pointer">شواهد و دستور کامل</summary>
        <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all">
          {text}
        </p>
      </details>
    </div>
  );
}

export function ArticleChatPreview({
  text,
  projectId,
}: {
  text: string;
  projectId: string;
}) {
  const navigate = useNavigate();
  const html = articlePreviewHtml(text);
  if (!html) return null;
  const readyToSave = articleHtml(text) !== null;
  return (
    <section className="max-w-full rounded-xl border border-base-300 bg-base-100 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">پیش‌نویس مقاله</p>
          <p className="text-xs text-base-content/60">
            {readyToSave
              ? "پیش از استفاده، ادعاها و ارزش افزودهٔ متن را بررسی کنید."
              : "بعضی برچسب‌ها برای ذخیره در وردپرس پذیرفته نیستند؛ متن را در ویرایشگر اصلاح کنید."}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            sessionStorage.setItem(`openseo-article-import-${projectId}`, html);
            void navigate({
              to: "/p/$projectId/content",
              params: { projectId },
            });
          }}
        >
          {readyToSave ? "ویرایش در نگارش مقاله" : "اصلاح در نگارش مقاله"}
        </button>
      </div>
      <iframe
        title="پیش‌نمایش پیش‌نویس مقاله"
        sandbox=""
        className="h-96 w-full rounded-lg border border-base-300 bg-white"
        srcDoc={`<html lang="fa" dir="rtl"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font:15px/2 sans-serif;padding:20px;color:#17222f}h2,h3{line-height:1.5}</style>${html}</html>`}
      />
      <details className="mt-2 text-xs text-base-content/70">
        <summary className="cursor-pointer">نمایش HTML</summary>
        <pre
          dir="ltr"
          className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all"
        >
          {html}
        </pre>
      </details>
    </section>
  );
}
