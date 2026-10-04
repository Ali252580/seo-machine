import { Link } from "@tanstack/react-router";
import { ShieldAlert, Wrench } from "lucide-react";
import { isHostedClientAuthMode } from "@/lib/auth-mode";

export function SamSetupGate({
  errorMessage,
  reason,
  hasApiKey,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  reason: "missing_key" | "unsupported_runtime" | null;
  hasApiKey: boolean | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  const hosted = isHostedClientAuthMode();
  const unsupported = reason === "unsupported_runtime";

  return (
    <section
      dir="rtl"
      className="rounded-2xl border border-base-300 bg-base-100 p-6 md:p-7"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-warning/15 p-2.5 text-warning">
          <Wrench className="size-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            {unsupported
              ? "اجرای SAM روی Vercel در دست آماده‌سازی است"
              : "راه‌اندازی عامل هوشمند SAM"}
          </h1>
          <p className="text-sm leading-7 text-base-content/70">
            {unsupported
              ? "موتور گفت‌وگوی فعلی SAM مخصوص Cloudflare است و هنوز روی Vercel اجرا نمی‌شود. افزودن کلید به‌تنهایی این بخش را فعال نمی‌کند."
              : "SAM عامل هوشمند داخل OpenSEO است. برای دریافت پاسخ، کلید OpenRouter باید در تنظیمات سرور ثبت شود؛ آن را داخل فرم سایت یا گفت‌وگو وارد نکنید."}
          </p>
        </div>
      </div>

      {unsupported && (
        <p className="mt-4 text-sm text-base-content/70">
          وضعیت کلید OpenRouter در سرور:{" "}
          <strong>{hasApiKey ? "ثبت شده" : "ثبت نشده"}</strong>
        </p>
      )}

      {!unsupported && (
        <ol className="mt-5 list-decimal space-y-2 pr-5 text-sm leading-7 text-base-content/75">
          <li>در OpenRouter یک کلید API بسازید.</li>
          <li>
            {hosted
              ? "در تنظیمات Environment Variables پروژهٔ Vercel"
              : "در متغیرهای محیطی سرور"}
            ، کلید را با نام <code dir="ltr">OPENROUTER_API_KEY</code> ثبت کنید.
          </li>
          <li>
            {hosted
              ? "یک Deployment تازه بسازید."
              : "برنامه را دوباره اجرا کنید."}
          </li>
        </ol>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {!unsupported && (
          <>
            <a
              className="btn"
              href="https://openrouter.ai/settings/keys"
              target="_blank"
              rel="noreferrer"
            >
              ساخت کلید OpenRouter
            </a>
            {hosted && (
              <a
                className="btn"
                href="https://vercel.com/chekad/seo-machine-api/settings/environment-variables"
                target="_blank"
                rel="noreferrer"
              >
                تنظیمات Vercel
              </a>
            )}
            <Link className="btn btn-ghost" to="/help/openrouter-api-key">
              راهنمای کامل
            </Link>
          </>
        )}
        <button
          className="btn btn-primary"
          type="button"
          onClick={onRetry}
          disabled={isRefetching}
        >
          {isRefetching ? "در حال بررسی…" : "بررسی دوباره"}
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-warning mt-5" role="status">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
}
