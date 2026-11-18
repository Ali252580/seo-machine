import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";

const stages = ["بررسی شواهد", "ساخت نشست SAM", "نگارش با SAM"];
const labels = [
  "بررسی موضوع و صفحات مرتبط",
  "آماده‌سازی نویسنده",
  "نوشتن مقاله و لینک‌های داخلی",
];
const guidance: Record<string, string> = {
  INTERNAL_ERROR:
    "نگارش به پایان نرسید. کمی بعد دوباره تلاش کنید؛ اگر تکرار شد، جزئیات خطا را برای پشتیبانی بفرستید.",
  RATE_LIMITED:
    "تعداد درخواست‌ها به سقف مجاز رسیده است. کمی صبر کنید و دوباره تلاش کنید.",
  INSUFFICIENT_CREDITS:
    "اعتبار حساب برای ادامه کافی نیست. وضعیت اعتبار را در بخش صورتحساب بررسی کنید.",
  UPSTREAM_UNAVAILABLE:
    "سرویس نویسنده فعلاً پاسخ نمی‌دهد. کمی بعد دوباره تلاش کنید.",
  FORBIDDEN:
    "حساب شما اجازهٔ انجام این کار را ندارد. دسترسی پروژه را با مدیر بررسی کنید.",
  UNAUTHENTICATED: "نشست شما پایان یافته است. دوباره وارد حساب شوید.",
};

export function ArticleGenerationStatus({
  pending,
  success,
  error,
  stage,
}: {
  pending: boolean;
  success: boolean;
  error: Error | null;
  stage: string;
}) {
  if (pending)
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-primary/25 bg-primary/5 p-4"
      >
        <p className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span
            className="loading loading-spinner loading-sm"
            aria-hidden="true"
          />
          مقاله در حال آماده‌سازی است
        </p>
        <ol className="space-y-2 text-sm">
          {labels.map((label, index) => (
            <li
              key={label}
              aria-current={
                index === stages.indexOf(stage) ? "step" : undefined
              }
              className={
                index === stages.indexOf(stage)
                  ? "font-semibold text-primary"
                  : "text-base-content/65"
              }
            >
              {index < stages.indexOf(stage) ? "✓" : `${index + 1}.`} {label}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-6">
          این صفحه را باز نگه دارید. پس از دریافت مقاله، پیش‌نمایش به‌روز می‌شود
          و متن قبلی تا آن زمان حفظ می‌شود.
        </p>
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm leading-7"
      >
        <p className="font-semibold">مقالهٔ جدید آماده نشد</p>
        <p>
          {guidance[getErrorCode(error) ?? ""] ??
            getStandardErrorMessage(error)}
        </p>
        <p>
          متن قبلی شما تغییر نکرده است. برای تلاش دوباره، دکمهٔ نگارش را بزنید.
        </p>
        <details className="mt-2 text-xs text-base-content/65">
          <summary className="cursor-pointer">جزئیات برای پشتیبانی</summary>
          <p>
            {stage}: {getStandardErrorMessage(error)}
          </p>
        </details>
      </div>
    );
  if (success)
    return (
      <p
        role="status"
        className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm"
      >
        پیش‌نویس آماده شد.{" "}
        <a href="#article-preview" className="link font-medium">
          مشاهده و بازبینی مقاله
        </a>
      </p>
    );
  return null;
}
