import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useBillingAccount } from "@/client/features/billing/useBillingAccount";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { CREDIT_PACKAGES_USD } from "@/shared/billing";
import {
  confirmUsdtTopup,
  createNextPayCheckout,
} from "@/serverFunctions/billing";

const PACKAGES = CREDIT_PACKAGES_USD;
type PackageAmount = (typeof PACKAGES)[number];

export const Route = createFileRoute("/_app/billing")({
  beforeLoad: () => {
    if (!isHostedClientAuthMode()) throw notFound();
  },
  component: BillingPage,
});

function BillingPage() {
  const account = useBillingAccount();
  const canManage = useCanManageBilling();
  const [amount, setAmount] = useState<PackageAmount>(10);
  const [txId, setTxId] = useState("");
  const [busy, setBusy] = useState(false);

  if (!account.data) {
    return <div className="p-8">در حال دریافت اطلاعات کیف پول…</div>;
  }

  async function payWithNextPay() {
    setBusy(true);
    try {
      const result = await createNextPayCheckout({
        data: { amountUsd: amount },
      });
      window.location.assign(result.url);
    } catch {
      toast.error("ساخت پرداخت ریالی انجام نشد.");
      setBusy(false);
    }
  }

  async function confirmUsdt() {
    setBusy(true);
    try {
      await confirmUsdtTopup({
        data: { amountUsd: amount, transactionId: txId.trim() },
      });
      await account.refetch();
      setTxId("");
      toast.success("پرداخت تتر تأیید و اعتبار اضافه شد.");
    } catch {
      toast.error("تراکنش تأیید نشد یا قبلاً استفاده شده است.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 py-10 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">کیف پول و اعتبار</h1>
        <p className="mt-1 text-sm text-base-content/60">
          هر بسته، دسترسی به SAM و مهارت‌های سئو را داخل سایت فعال می‌کند.
          هزینهٔ عامل و ابزارها از اعتبار مشترک سازمان کم می‌شود؛ نیازی به کلید
          API کاربر نیست.
        </p>
      </div>

      <section className="rounded-xl border border-base-300 bg-base-100 p-5">
        <div className="text-sm text-base-content/60">موجودی فعلی</div>
        <div className="mt-1 text-3xl font-bold tabular-nums" dir="ltr">
          ${account.data.balanceUsd.toFixed(2)}
        </div>
        <div className="mt-1 text-xs text-base-content/50 tabular-nums">
          {account.data.credits.toLocaleString("fa-IR")} اعتبار
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-base-300 bg-base-100 p-5">
        <h2 className="font-semibold">انتخاب بسته</h2>
        <div className="grid grid-cols-3 gap-3">
          {PACKAGES.map((value) => (
            <button
              key={value}
              type="button"
              className={`btn ${amount === value ? "btn-primary" : "btn-outline"}`}
              onClick={() => setAmount(value)}
            >
              ${value}
            </button>
          ))}
        </div>
      </section>

      {!canManage ? (
        <div className="alert alert-warning">
          فقط مالک سازمان می‌تواند حساب را شارژ کند.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-base-300 bg-base-100 p-5">
            <h2 className="font-semibold">پرداخت ریالی</h2>
            <p className="text-sm text-base-content/60">
              پرداخت با کارت بانکی از طریق NextPay.
            </p>
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={busy || !account.data.nextPayEnabled}
              onClick={() => void payWithNextPay()}
            >
              پرداخت ریالی
            </button>
            {!account.data.nextPayEnabled ? (
              <p className="text-xs text-warning">
                پرداخت ریالی فعلاً در دسترس نیست.
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-xl border border-base-300 bg-base-100 p-5">
            <h2 className="font-semibold">پرداخت با تتر</h2>
            <p className="text-sm text-base-content/60">
              مبلغ بسته را روی شبکه TRC20 بفرستید و شناسه تراکنش را ثبت کنید.
            </p>
            {account.data.usdtWallet ? (
              <code
                className="block break-all rounded bg-base-200 p-2 text-xs"
                dir="ltr"
              >
                {account.data.usdtWallet}
              </code>
            ) : null}
            <input
              className="input input-bordered w-full"
              dir="ltr"
              placeholder="Transaction ID"
              value={txId}
              onChange={(event) => setTxId(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={
                busy || !account.data.usdtEnabled || txId.trim().length !== 64
              }
              onClick={() => void confirmUsdt()}
            >
              بررسی و شارژ
            </button>
            {!account.data.usdtEnabled ? (
              <p className="text-xs text-warning">
                پرداخت با تتر فعلاً در دسترس نیست.
              </p>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
