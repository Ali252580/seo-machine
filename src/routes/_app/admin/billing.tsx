import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminBillingOverview } from "@/serverFunctions/admin-billing";

export const Route = createFileRoute("/_app/admin/billing")({
  component: AdminBillingPage,
});

const usd = (value: number) => `$${value.toFixed(2)}`;
const date = (value: string | Date) =>
  new Date(value).toLocaleString("fa-IR", { dateStyle: "medium" });

function AdminBillingPage() {
  const query = useQuery({
    queryKey: ["platform-admin-billing"],
    queryFn: () => getAdminBillingOverview(),
    retry: false,
  });

  if (query.isPending) {
    return <div className="p-8">در حال دریافت گزارش مدیریتی…</div>;
  }
  if (query.isError) {
    return <div className="alert alert-error m-6">دسترسی ادمین ندارید.</div>;
  }

  const data = query.data;
  return (
    <main
      className="mx-auto w-full max-w-7xl space-y-6 p-4 py-8 md:p-6"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">مدیریت کاربران و اعتبار</h1>
          <p className="mt-1 text-sm text-base-content/60">
            نمای کلی موجودی کاربران و شارژهای ثبت‌شده سایت
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => void query.refetch()}
        >
          به‌روزرسانی
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="کاربران"
          value={data.summary.users.toLocaleString("fa-IR")}
        />
        <Stat
          label="سازمان‌ها"
          value={data.summary.organizations.toLocaleString("fa-IR")}
        />
        <Stat label="موجودی کل" value={usd(data.summary.totalBalanceUsd)} />
        <Stat label="کل شارژ موفق" value={usd(data.summary.totalTopupsUsd)} />
        <Stat
          label="پرداخت‌های موفق"
          value={data.summary.successfulPayments.toLocaleString("fa-IR")}
        />
      </div>

      <AdminTable title="حساب‌ها و موجودی">
        <thead>
          <tr>
            <th>سازمان</th>
            <th>مالک</th>
            <th>اعضا</th>
            <th>موجودی</th>
            <th>کل شارژ</th>
            <th>پرداخت موفق</th>
          </tr>
        </thead>
        <tbody>
          {data.workspaces.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td dir="ltr">{row.ownerEmail ?? "—"}</td>
              <td>{row.memberCount.toLocaleString("fa-IR")}</td>
              <td dir="ltr">{usd(row.balanceUsd)}</td>
              <td dir="ltr">{usd(row.topupsUsd)}</td>
              <td>{row.successfulPayments.toLocaleString("fa-IR")}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminTable title="کاربران">
        <thead>
          <tr>
            <th>نام</th>
            <th>ایمیل</th>
            <th>تعداد سازمان</th>
            <th>تاریخ عضویت</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td dir="ltr">{row.email}</td>
              <td>{row.organizationCount.toLocaleString("fa-IR")}</td>
              <td>{date(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminTable title="تاریخچه شارژها">
        <thead>
          <tr>
            <th>سازمان</th>
            <th>روش</th>
            <th>وضعیت</th>
            <th>مبلغ</th>
            <th>مبلغ ریالی</th>
            <th>تاریخ</th>
          </tr>
        </thead>
        <tbody>
          {data.payments.map((row) => (
            <tr key={row.id}>
              <td>{row.organizationName}</td>
              <td>{row.provider === "nextpay" ? "نکست‌پی" : "تتر TRC20"}</td>
              <td>{paymentStatus(row.status)}</td>
              <td dir="ltr">{usd(row.amountUsd)}</td>
              <td>
                {row.amountIrt == null
                  ? "—"
                  : `${row.amountIrt.toLocaleString("fa-IR")} تومان`}
              </td>
              <td>{date(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4">
      <div className="text-sm text-base-content/60">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function AdminTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100">
      <h2 className="border-b border-base-300 px-4 py-3 font-semibold">
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="table table-sm">{children}</table>
      </div>
    </section>
  );
}

function paymentStatus(status: string) {
  return (
    (
      {
        pending: "در انتظار",
        verified: "تأییدشده",
        credited: "واریزشده",
        failed: "ناموفق",
      } as Record<string, string>
    )[status] ?? status
  );
}
