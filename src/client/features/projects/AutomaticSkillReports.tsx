import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { automaticSkills } from "@/shared/automaticSkills";
import { getProjectSkillRuns } from "@/serverFunctions/automation";
import { Markdown } from "@/client/components/Markdown";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

const labels = {
  reviewed: "بررسی ثبت شد",
  partial: "بررسی محدود",
  needs_input: "نیازمند اطلاعات",
  error: "تکمیل نشد",
};
export function AutomaticSkillReports({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ["automaticSkillRuns", projectId],
    queryFn: () => getProjectSkillRuns({ data: { projectId } }),
    refetchInterval: 60000,
  });
  return (
    <section className="space-y-4 rounded-xl border border-base-300 p-4">
      <h2 className="text-xl font-bold">نتیجهٔ مهارت‌های خودکار</h2>
      <p className="text-sm leading-7">
        هر مهارت گزارش مستقل دارد. «بررسی ثبت شد» به معنی ثبت تحلیل است؛ انجام
        کامل تمام مراحل یا تغییر سایت را نشان نمی‌دهد. محدودیت‌ها و داده‌های
        استفاده‌شده در گزارش آمده‌اند.
      </p>
      <Link
        className="link text-sm"
        to="/p/$projectId/context"
        params={{ projectId }}
      >
        تکمیل هدف‌ها، رقبا و صفحات مهم در زمینهٔ پروژه
      </Link>
      {query.isPending && <p role="status">در حال دریافت گزارش‌ها…</p>}
      {query.error && (
        <div role="alert">
          <p>{getStandardErrorMessage(query.error)}</p>
          <button className="btn btn-sm" onClick={() => void query.refetch()}>
            تلاش مجدد
          </button>
        </div>
      )}
      {automaticSkills.map((skill) => {
        const run = query.data?.find((item) => item.name === skill.name);
        return (
          <details
            key={skill.name}
            className="rounded-lg border border-base-300 p-3"
          >
            <summary className="cursor-pointer leading-7">
              {skill.title}{" "}
              <span className="badge badge-outline ms-2">
                {run ? labels[run.status] : "هنوز اجرا نشده"}
              </span>
            </summary>
            <p className="my-2 text-xs text-base-content/60" dir="ltr">
              {skill.name}
            </p>
            {run ? (
              <>
                <p className="mb-3 text-xs">
                  آخرین اجرا: {new Date(run.updatedAt).toLocaleString("fa-IR")}
                </p>
                <Markdown>{run.report}</Markdown>
                <p className="mt-3 text-xs text-base-content/60">
                  ابزارهای فراخوانی‌شده (شامل تلاش ناموفق):{" "}
                  {run.tools.join("، ") || "تحلیل زمینهٔ ذخیره‌شده"}
                </p>
              </>
            ) : (
              <p className="text-sm">
                پس از فعال‌سازی اجرای مهارت‌ها، نتیجه در نوبت این مهارت ثبت
                می‌شود.
              </p>
            )}
          </details>
        );
      })}
    </section>
  );
}
