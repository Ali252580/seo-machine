import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getLastProjectId } from "@/client/lib/active-project";
import { getProjects } from "@/serverFunctions/projects";

const SKILLS = [
  ["seo-coach", "وضعیت سایت و گام بعدی را توضیح می‌دهد."],
  ["seo-project-setup", "هدف‌ها، رقبا و صفحات مهم پروژه را ثبت می‌کند."],
  ["seo-audit", "سایت را بررسی و مشکلات مهم را مشخص می‌کند."],
  ["keyword-research", "فرصت‌های کلمات کلیدی را پیدا می‌کند."],
  ["keyword-clustering", "کلمات را براساس هدف جست‌وجو گروه‌بندی می‌کند."],
  ["competitive-landscape", "رقبای بازار را بررسی می‌کند."],
  ["competitor-analysis", "محتوا و بک‌لینک‌های یک رقیب را بررسی می‌کند."],
  ["link-prospecting", "فرصت‌های دریافت لینک را پیدا می‌کند."],
  ["local-seo", "نمایش محلی کسب‌وکار را بررسی می‌کند."],
] as const;

export const Route = createFileRoute("/_app/ai")({
  component: AiPage,
});

function AiPage() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });
  const projects = projectsQuery.data ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    if (projects.length === 0) return;
    setSelectedProjectId((current) =>
      projects.some((project) => project.id === current)
        ? current
        : (projects.find((project) => project.id === getLastProjectId())?.id ??
          projects[0].id),
    );
  }, [projects]);

  return (
    <main
      dir="rtl"
      className="h-full overflow-auto bg-base-100 px-4 py-12 pb-24 md:px-6 md:py-16 md:pb-12"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            عامل هوشمند و مهارت‌ها
          </h1>
          <p className="mt-3 text-sm leading-7 text-base-content/70">
            SAM و مهارت‌های سئو داخل سایت آماده‌اند. پس از شارژ اعتبار، پروژهٔ
            خود را باز کنید و درخواستتان را بنویسید. هزینهٔ عامل و ابزارها از
            اعتبار مشترک سازمان کسر می‌شود؛ نیازی به کلید API یا نصب جداگانه
            برای هر کاربر نیست.
          </p>
        </div>

        <section className="rounded-xl border border-base-300 p-5 sm:p-6">
          <h2 className="font-semibold">شروع کار با SAM</h2>
          <p className="mt-2 text-sm leading-7 text-base-content/70">
            پروژه را انتخاب کنید و گفت‌وگو را مستقیم در SAM شروع کنید. مهارت
            مناسب درخواست شما به‌صورت خودکار فعال می‌شود.
          </p>
          {projectsQuery.isLoading ? (
            <p className="mt-4 text-sm" role="status">
              در حال دریافت پروژه‌ها…
            </p>
          ) : projectsQuery.isError ? (
            <p className="mt-4 text-sm text-error" role="alert">
              دریافت پروژه‌ها ناموفق بود.
            </p>
          ) : projects.length === 0 ? (
            <Link to="/projects" className="btn btn-primary mt-5">
              ساخت پروژهٔ اول
            </Link>
          ) : (
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="form-control min-w-48 flex-1">
                <span className="mb-1 block text-sm">پروژه</span>
                <select
                  className="select select-bordered w-full"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                to="/p/$projectId/sam"
                params={{ projectId: selectedProjectId || projects[0].id }}
                className="btn btn-primary"
              >
                شروع گفت‌وگو
              </Link>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/billing" className="btn btn-outline">
              اعتبار و بسته‌ها
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-base-300 p-5 sm:p-6">
          <h2 className="font-semibold">مهارت‌های آماده</h2>
          <p className="mt-2 text-sm text-base-content/60">
            کافی است کار موردنظر را در گفت‌وگو توضیح دهید.
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            {SKILLS.map(([name, description]) => (
              <li
                key={name}
                className="flex flex-col gap-1 sm:flex-row sm:gap-3"
              >
                <code dir="ltr" className="shrink-0 font-mono sm:w-48">
                  {name}
                </code>
                <span className="text-base-content/60">{description}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
