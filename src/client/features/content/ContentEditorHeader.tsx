import { Link } from "@tanstack/react-router";
import { useProjectMarket } from "@/client/features/projects/useProjectMarket";

export function ContentEditorHeader({
  projectId,
  targetPage,
  blog = false,
}: {
  projectId: string;
  targetPage?: string;
  blog?: boolean;
}) {
  const project = useProjectMarket(projectId);
  return (
    <>
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <h1 className="text-2xl font-semibold">
            {blog ? "نگارش وبلاگ" : "نگارش و بهبود صفحات سایت با SAM"}
          </h1>
          {project && (
            <dl className="my-3 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-base-300 bg-base-200/50 px-3 py-2 text-sm">
              <div className="flex min-w-0 items-baseline gap-2">
                <dt className="shrink-0 text-base-content/60">پروژه:</dt>
                <dd className="min-w-0 break-words font-medium" dir="auto">
                  {project.name || "پروژهٔ جاری"}
                </dd>
              </div>
              {project.domain && (
                <div className="flex min-w-0 items-baseline gap-2">
                  <dt className="shrink-0 text-base-content/60">سایت:</dt>
                  <dd className="min-w-0 break-all font-medium" dir="ltr">
                    {project.domain}
                  </dd>
                </div>
              )}
            </dl>
          )}
          <p className="text-sm text-base-content/60">
            {blog
              ? "مقالهٔ آموزشی، راهنمای کاربردی یا پاسخ به پرسش مخاطبان همین سایت؛ با زمینهٔ پروژه و ترجیحات نگارش شما. پیش‌نویس را ویرایش کنید، تصویر بسازید و برای بازبینی به وردپرس بفرستید."
              : targetPage
                ? "صفحهٔ موجود را با داده‌های جست‌وجو و مهارت‌های SAM بررسی و پیش‌نویس بهبود را بازبینی کنید."
                : "بنویسید، بازبینی کنید و پیش‌نویس را به وردپرس بفرستید."}
          </p>
        </div>
        <Link
          to="/p/$projectId/clusters"
          params={{ projectId }}
          className="btn btn-primary btn-sm shrink-0"
        >
          نقشهٔ پیلار و کلاستر
        </Link>
        <Link
          to="/p/$projectId/sam"
          params={{ projectId }}
          className="btn btn-outline btn-sm shrink-0"
        >
          گفت‌وگو با SAM
        </Link>
      </header>
      {targetPage && (
        <p className="alert alert-info text-sm">
          این پیشنهاد برای بهبود یک صفحهٔ موجود است. SAM شواهد و متن همان صفحه
          را بررسی می‌کند و پیش‌نویس ویرایش می‌سازد؛ صفحهٔ تازه در وردپرس ایجاد
          نمی‌شود.
          <a
            href={targetPage}
            target="_blank"
            rel="noreferrer"
            className="link"
            dir="ltr"
          >
            مشاهدهٔ صفحه
          </a>
        </p>
      )}
    </>
  );
}
