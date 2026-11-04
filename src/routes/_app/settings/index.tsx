import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiKeySettings } from "@/client/features/settings/ApiKeySettings";
import { type ThemePreference, useThemePreference } from "@/client/lib/theme";
import { authClient, useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { version } from "../../../../package.json";

export const Route = createFileRoute("/_app/settings/")({
  component: PersonalSettings,
});

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "system", label: "سیستم", icon: Monitor },
  { value: "light", label: "روشن", icon: Sun },
  { value: "dark", label: "تیره", icon: Moon },
];

function PersonalSettings() {
  const isHosted = isHostedClientAuthMode();
  const { themePreference, setThemePreference } = useThemePreference();
  const { data: session, isPending: isSessionPending } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const analyticsEnabled = session?.user?.analyticsOptedOut !== true;

  async function updateAnalyticsPreference(enabled: boolean) {
    setIsSaving(true);
    try {
      const result = await authClient.updateUser({
        analyticsOptedOut: !enabled,
      });
      if (result.error) {
        toast.error("ذخیرهٔ تنظیمات آمار استفاده انجام نشد.");
      } else {
        toast.success(
          enabled
            ? "ارسال آمار استفاده فعال شد"
            : "ارسال آمار استفاده غیرفعال شد",
        );
      }
    } catch {
      toast.error("ذخیرهٔ تنظیمات آمار استفاده انجام نشد.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-base-content/50">ظاهر</h2>
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm">پوسته</span>
          <div
            role="radiogroup"
            aria-label="انتخاب پوسته"
            className="flex gap-0.5 rounded-lg bg-base-200 p-0.5"
          >
            {THEME_OPTIONS.map((option) => {
              const isActive = option.value === themePreference;
              const Icon = option.icon;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={option.label}
                  className={`flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 transition-colors ${
                    isActive
                      ? "bg-base-100 text-base-content shadow-sm"
                      : "text-base-content/50 hover:text-base-content/80"
                  }`}
                  onClick={() => setThemePreference(option.value)}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {isHosted ? (
        <>
          <ApiKeySettings />

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-base-content/50">
              آمار استفاده
            </h2>
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm">کمک به بهبود سایت</p>
                <p className="mt-1 text-sm text-base-content/60">
                  با ارسال آمار استفاده، به بهبود امکانات سایت کمک کنید.
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={analyticsEnabled}
                disabled={isSessionPending || isSaving || !session?.user}
                onChange={(event) => {
                  void updateAnalyticsPreference(event.currentTarget.checked);
                }}
                aria-label="فعال‌کردن ارسال آمار استفاده"
              />
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-base-content/50">درباره</h2>
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm">نسخه</span>
            <span className="font-mono text-sm text-base-content/60">
              v{version}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
