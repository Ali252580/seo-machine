import { ShieldAlert } from "lucide-react";

export function SamSetupGate({
  reason,
  isRefetching,
  onRetry,
}: {
  reason: "missing_key" | "missing_database" | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  const errorCode =
    reason === "missing_key"
      ? "SAM-KEY"
      : reason === "missing_database"
        ? "SAM-DB"
        : "SAM-CHECK";

  return (
    <section
      dir="rtl"
      className="rounded-2xl border border-base-300 bg-base-100 p-6 md:p-7"
      role="status"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-1 size-5 shrink-0 text-warning" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            عامل هوشمند موقتاً در دسترس نیست
          </h1>
          <p className="text-sm leading-7 text-base-content/70">
            لطفاً کمی بعد دوباره تلاش کنید. برای استفاده از SAM نیازی به تنظیم
            کلید یا اتصال حساب جداگانه ندارید.
          </p>
          <p className="text-xs text-base-content/50" dir="ltr">
            {errorCode}
          </p>
        </div>
      </div>
      <button
        className="btn btn-primary mt-5"
        type="button"
        onClick={onRetry}
        disabled={isRefetching}
      >
        {isRefetching ? "در حال بررسی…" : "تلاش دوباره"}
      </button>
    </section>
  );
}
