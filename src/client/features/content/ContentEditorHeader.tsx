import { Link } from "@tanstack/react-router";

export function ContentEditorHeader({
  projectId,
  targetPage,
}: {
  projectId: string;
  targetPage?: string;
}) {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">نگارش محتوا با SAM</h1>
          <p className="text-sm text-base-content/60">
            {targetPage
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
