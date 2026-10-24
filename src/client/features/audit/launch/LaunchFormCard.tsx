import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { MIN_PAGES } from "@/client/features/audit/launch/types";
import type { useLaunchController } from "@/client/features/audit/launch/useLaunchController";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { PAID_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

type Props = {
  launchForm: ReturnType<typeof useLaunchController>["launchForm"];
  commitMaxPagesInput: () => number;
  maxPagesLimit: number;
  lighthouseAvailable: boolean;
};

export function LaunchFormCard({
  commitMaxPagesInput,
  launchForm,
  maxPagesLimit,
  lighthouseAvailable,
}: Props) {
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-4">
        <h2 className="card-title text-base">شروع ممیزی جدید</h2>

        <form
          className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void launchForm.handleSubmit();
          }}
        >
          <launchForm.Field name="url">
            {(field) => {
              const urlError = getFieldError(field.state.meta.errors);

              return (
                <label
                  className={`input input-bordered w-full lg:col-span-9 ${urlError ? "input-error" : ""}`}
                >
                  <input
                    placeholder="https://example.com"
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      if (launchForm.state.errorMap.onSubmit) {
                        launchForm.setErrorMap({ onSubmit: undefined });
                      }
                    }}
                  />
                </label>
              );
            }}
          </launchForm.Field>

          <launchForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                className="btn btn-primary btn-sm w-full lg:col-span-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> در حال شروع…
                  </>
                ) : (
                  "شروع خزیدن سایت"
                )}
              </button>
            )}
          </launchForm.Subscribe>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-12 lg:items-start">
            <LaunchOptions
              launchForm={launchForm}
              commitMaxPagesInput={commitMaxPagesInput}
              maxPagesLimit={maxPagesLimit}
              lighthouseAvailable={lighthouseAvailable}
            />
            {lighthouseAvailable ? (
              <LighthouseOptions launchForm={launchForm} />
            ) : (
              <div
                className="rounded-lg bg-base-200/40 p-3 text-sm leading-7"
                dir="rtl"
              >
                بررسی HTML صفحات، بدون اجرای جاوااسکریپت و Lighthouse. پیشرفت
                ذخیره می‌شود؛ بررسی نیمه‌تمام با بازکردن گزارش یا نوبت زمان‌بندی
                بعدی ادامه می‌یابد.
              </div>
            )}
          </div>
        </form>

        <LaunchErrors launchForm={launchForm} />
      </div>
    </div>
  );
}

function LaunchOptions({
  launchForm,
  commitMaxPagesInput,
  maxPagesLimit,
}: Props) {
  const isFreeLimited = maxPagesLimit < 100;

  return (
    <div className="rounded-lg border border-base-300 bg-base-200/20 p-3 space-y-2">
      <label className="text-xs font-medium uppercase tracking-wide text-base-content/60">
        محدودهٔ بررسی
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-base-content/70">حداکثر صفحه‌ها</span>
        <launchForm.Field name="maxPagesInput">
          {(field) => (
            <input
              type="number"
              min={MIN_PAGES}
              max={maxPagesLimit}
              className="input input-bordered input-sm w-28"
              value={field.state.value}
              onChange={(event) => {
                const next = event.target.value;
                if (!/^\d*$/.test(next)) return;
                field.handleChange(next);
                if (launchForm.state.errorMap.onSubmit) {
                  launchForm.setErrorMap({ onSubmit: undefined });
                }
              }}
              onBlur={commitMaxPagesInput}
            />
          )}
        </launchForm.Field>
      </div>
      <p className="text-xs text-base-content/50">
        بین {MIN_PAGES} تا {maxPagesLimit.toLocaleString()} صفحه انتخاب کنید.
        {isFreeLimited ? (
          <>
            {" "}
            <Link
              to={SUBSCRIBE_ROUTE}
              search={{ upgrade: true }}
              className="link link-primary"
            >
              Upgrade
            </Link>{" "}
            to crawl up to {PAID_MAX_AUDIT_PAGES.toLocaleString()} pages.
          </>
        ) : null}
      </p>
    </div>
  );
}

function LighthouseOptions({ launchForm }: Pick<Props, "launchForm">) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-200/20 p-3 space-y-2">
      <label className="label cursor-pointer justify-start gap-2 p-0">
        <launchForm.Field name="runLighthouse">
          {(field) => (
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={Boolean(field.state.value)}
              onChange={(event) => field.handleChange(event.target.checked)}
            />
          )}
        </launchForm.Field>
        <span
          className="text-sm font-medium text-base-content/80"
          title="Lighthouse measures the performance of your pages and identifies issues."
        >
          Include Lighthouse
        </span>
      </label>

      <launchForm.Subscribe
        selector={(snapshot) => snapshot.values.runLighthouse}
      >
        {(runLighthouse) =>
          runLighthouse ? (
            <div className="space-y-1">
              <p className="text-xs text-base-content/60">
                We choose a sample of 20 pages to audit, removing pages from
                duplicate templates.
              </p>
            </div>
          ) : null
        }
      </launchForm.Subscribe>
    </div>
  );
}

function LaunchErrors({ launchForm }: Pick<Props, "launchForm">) {
  return (
    <div className="space-y-2">
      <launchForm.Field name="url">
        {(field) => {
          const urlError = getFieldError(field.state.meta.errors);

          return urlError ? (
            <p className="text-sm text-error">{urlError}</p>
          ) : null;
        }}
      </launchForm.Field>

      <launchForm.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(submitError) => {
          const errorMessage = getFormError(submitError);

          return errorMessage ? (
            <div className="alert alert-error py-2">
              <span className="text-sm">{errorMessage}</span>
            </div>
          ) : null;
        }}
      </launchForm.Subscribe>
    </div>
  );
}
