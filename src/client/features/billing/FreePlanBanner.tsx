import { Link } from "@tanstack/react-router";
import { useBillingAccount } from "@/client/features/billing/useBillingAccount";

export function FreePlanBanner() {
  const account = useBillingAccount();
  if (!account.data) return null;
  if (account.data.balanceUsd > 0.25 && account.data.isPaying) return null;

  return (
    <div className="shrink-0 px-4 py-2.5 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div
          className={`alert text-sm ${account.data.balanceUsd <= 0 ? "alert-error" : "alert-warning"}`}
        >
          <span>
            {account.data.balanceUsd <= 0
              ? "اعتبار شما تمام شده است."
              : `اعتبار باقی‌مانده: ${account.data.balanceUsd.toFixed(2)} دلار.`}{" "}
            <Link to="/billing" className="link link-primary font-medium">
              شارژ حساب
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
