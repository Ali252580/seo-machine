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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {blog ? "نگارش وبلاگ" : "نگارش محتوا با SAM"}
          </h1>
          {blog && (
            <p className="my-2 text-sm font-medium">
              {project?.name ?? "پروژهٔ جاری"}
              {project?.domain && (
                <span
                  className="ms-2 inline-block text-base-content/60"
                  dir="ltr"
                >
                  {project.domain}
                </span>
              )}
            </p>
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
          to="/p/$projectId/sam"
          params={{ projectId }}
          className="btn btn-outline btn-sm"
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
