import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAdminBillingOverview } from "@/serverFunctions/admin-billing";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { billingUsageCsv } from "@/client/features/billing/admin-export";

export const Route = createFileRoute("/_app/admin/billing")({
  component: AdminBillingPage,
});

const usd = (value: number) => `$${value.toFixed(2)}`;
const date = (value: string | Date) =>
  new Date(value).toLocaleString("fa-IR", { dateStyle: "medium" });

function AdminBillingPage() {
  const [range, setRange] = useState(() => ({
    from: new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }));
  const [draft, setDraft] = useState(range);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["platform-admin-billing", range],
    queryFn: () => getAdminBillingOverview({ data: range }),
    retry: false,
  });

  if (query.isPending) {
    return <div className="p-8">در حال دریافت گزارش مدیریتی…</div>;
  }
  if (query.isError) {
    return (
      <div className="m-6 space-y-3">
        <div className="alert alert-error">
          {getStandardErrorMessage(query.error, "گزارش دریافت نشد.")}
        </div>
        <button className="btn" onClick={() => void query.refetch()}>
          تلاش دوباره
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            const reset = {
              from: new Date(Date.now() - 29 * 86_400_000)
                .toISOString()
                .slice(0, 10),
              to: new Date().toISOString().slice(0, 10),
            };
            setDraft(reset);
            setRange(reset);
          }}
        >
          بازگشت به بازهٔ ۳۰ روزه
        </button>
      </div>
    );
  }

  const data = query.data;
  const matches = (...values: (string | null)[]) =>
    values.join(" ").toLowerCase().includes(search.trim().toLowerCase());
  const usage = data.usage.filter((row) =>
    matches(row.userEmail, row.organizationName, row.feature, row.provider),
  );
  const exportUsage = () => {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", billingUsageCsv(usage)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `usage-${range.from}-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main
      className="mx-auto w-full max-w-7xl space-y-6 p-4 py-8 md:p-6"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">مدیریت فروش و مصرف</h1>
          <p className="mt-1 text-sm text-base-content/60">
            فروش بسته‌ها، موجودی حساب‌ها و مصرف ابزارها در بازهٔ انتخاب‌شده
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => void query.refetch()}
        >
          به‌روزرسانی
        </button>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setRange(draft);
        }}
      >
        <label className="text-sm">
          از تاریخ (UTC)
          <input
            type="date"
            required
            className="input input-bordered mt-1 block"
            value={draft.from}
            max={draft.to}
            onChange={(event) =>
              setDraft({ ...draft, from: event.target.value })
            }
          />
        </label>
        <label className="text-sm">
          تا تاریخ (UTC)
          <input
            type="date"
            required
            className="input input-bordered mt-1 block"
            value={draft.to}
            min={draft.from}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          اعمال بازه
        </button>
        <label className="text-sm">
          جست‌وجوی حساب یا ابزار
          <input
            type="search"
            className="input input-bordered mt-1 block"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </form>
      <p className="text-xs leading-6 text-base-content/60">
        موجودی‌ها مقدار فعلی هستند؛ فروش و مصرف مربوط به بازهٔ انتخاب‌شده‌اند.
        ثبت جزئیات مصرف از نصب این نسخه شروع می‌شود. حاشیهٔ مصرف، سود خالص نیست.
        هزینهٔ رتبه‌یابی بر اساس نرخ هر جست‌وجو تخمین زده می‌شود.
      </p>

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
        <Stat
          label="اعتبار فروخته‌شده در بازه"
          value={usd(data.summary.totalTopupsUsd)}
        />
        <Stat
          label="پرداخت‌های موفق"
          value={data.summary.successfulPayments.toLocaleString("fa-IR")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="هزینهٔ پایهٔ سرویس‌ها"
          value={usd(data.report.rawCostUsd)}
        />
        <Stat label="اعتبار مصرف‌شده" value={usd(data.report.chargedUsd)} />
        <Stat label="حاشیهٔ مصرف" value={usd(data.report.marginUsd)} />
        <Stat
          label="پرداخت ثبت‌شده تومان"
          value={data.report.paidIrt.toLocaleString("fa-IR")}
        />
        <Stat
          label="پرداخت ثبت‌شده تتر"
          value={data.report.paidUsdt.toFixed(2)}
        />
      </div>

      <AdminTable title="فروش بسته‌های شارژ">
        <thead>
          <tr>
            <th>بسته</th>
            <th>تعداد فروش موفق</th>
            <th>اعتبار فروخته‌شده</th>
          </tr>
        </thead>
        <tbody>
          {data.report.packages.map((row) => (
            <tr key={row.amountUsd}>
              <td dir="ltr">{usd(row.amountUsd)}</td>
              <td>{row.count.toLocaleString("fa-IR")}</td>
              <td>{row.soldCredits.toLocaleString("fa-IR")}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      <AdminTable title="مصرف به تفکیک ابزار و ارائه‌دهنده">
        <thead>
          <tr>
            <th>ابزار / ارائه‌دهنده</th>
            <th>تعداد ثبت</th>
            <th>هزینهٔ پایه</th>
            <th>مصرف اعتبار</th>
            <th>حاشیهٔ مصرف</th>
          </tr>
        </thead>
        <tbody>
          {[...data.report.byFeature, ...data.report.byProvider].map(
            (row, index) => (
              <tr key={`${index}-${row.id}`}>
                <td>{featureLabel(row.id)}</td>
                <td>{row.calls.toLocaleString("fa-IR")}</td>
                <td dir="ltr">{usd(row.rawCostUsd)}</td>
                <td dir="ltr">{usd(row.chargedUsd)}</td>
                <td dir="ltr">{usd(row.marginUsd)}</td>
              </tr>
            ),
          )}
        </tbody>
      </AdminTable>

      <AdminTable title="حساب‌ها و موجودی">
        <thead>
          <tr>
            <th>سازمان</th>
            <th>مالک</th>
            <th>اعضا</th>
            <th>موجودی</th>
            <th>کل شارژ</th>
            <th>پرداخت موفق</th>
            <th>مصرف در بازه</th>
          </tr>
        </thead>
        <tbody>
          {data.workspaces
            .filter((row) => matches(row.name, row.ownerEmail))
            .map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td dir="ltr">{row.ownerEmail ?? "—"}</td>
                <td>{row.memberCount.toLocaleString("fa-IR")}</td>
                <td dir="ltr">{usd(row.balanceUsd)}</td>
                <td dir="ltr">{usd(row.topupsUsd)}</td>
                <td>{row.successfulPayments.toLocaleString("fa-IR")}</td>
                <td dir="ltr">{usd(row.usageUsd)}</td>
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
            <th>مصرف اعتبار</th>
            <th>تعداد ثبت مصرف</th>
          </tr>
        </thead>
        <tbody>
          {data.users
            .filter((row) => matches(row.name, row.email))
            .map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td dir="ltr">{row.email}</td>
                <td>{row.organizationCount.toLocaleString("fa-IR")}</td>
                <td>{date(row.createdAt)}</td>
                <td dir="ltr">{usd(row.usageUsd)}</td>
                <td>{row.calls.toLocaleString("fa-IR")}</td>
              </tr>
            ))}
        </tbody>
      </AdminTable>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-base-content/60">
          {data.usageCount.toLocaleString("fa-IR")} ثبت مصرف در بازه؛ آخرین ۵۰۰
          ثبت برای نمایش و خروجی. جست‌وجو روی همین ثبت‌ها اعمال می‌شود.
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={exportUsage}
        >
          خروجی CSV مصرف
        </button>
      </div>
      <AdminTable title="دفتر مصرف">
        <thead>
          <tr>
            <th>کاربر</th>
            <th>حساب</th>
            <th>پروژه</th>
            <th>ابزار</th>
            <th>ارائه‌دهنده</th>
            <th>هزینهٔ پایه</th>
            <th>اعتبار کسرشده</th>
            <th>موجودی پس از مصرف</th>
            <th>تاریخ</th>
          </tr>
        </thead>
        <tbody>
          {usage.length === 0 ? (
            <tr>
              <td colSpan={9}>مصرفی در این بازه یا جست‌وجو ثبت نشده است.</td>
            </tr>
          ) : (
            usage.map((row) => (
              <tr key={row.id}>
                <td dir="ltr">{row.userEmail}</td>
                <td>{row.organizationName}</td>
                <td dir="ltr">{row.projectId ?? "—"}</td>
                <td>{featureLabel(row.feature)}</td>
                <td>{row.provider}</td>
                <td dir="ltr">${(row.rawCostMicros / 1_000_000).toFixed(5)}</td>
                <td>{row.chargedCredits.toLocaleString("fa-IR")}</td>
                <td>{row.balanceAfter.toLocaleString("fa-IR")}</td>
                <td>{new Date(row.createdAt).toLocaleString("fa-IR")}</td>
              </tr>
            ))
          )}
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
          {data.payments
            .filter((row) => matches(row.organizationName))
            .map((row) => (
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

function featureLabel(id: string) {
  return (
    (
      {
        keyword_research: "تحقیق کلمات کلیدی",
        domain_overview: "بررسی دامنه",
        backlinks: "بک‌لینک",
        site_audit: "ممیزی سایت",
        rank_tracking: "ردیابی رتبه",
        agent: "عامل SAM",
        local_seo: "سئوی محلی",
        ai_citations: "حضور در هوش مصنوعی",
        ai_prompt_responses: "پاسخ هوش مصنوعی",
      } as Record<string, string>
    )[id] ?? id
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
