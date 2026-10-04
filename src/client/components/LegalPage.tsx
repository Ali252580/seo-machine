import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="h-dvh overflow-y-auto bg-base-200 text-base-content">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-bold">
            OpenSEO
          </Link>
          <Link to="/" className="btn btn-ghost btn-sm">
            بازگشت به برنامه
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm sm:p-8">
          <header className="mb-8 border-b border-base-300 pb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="mt-3 leading-7 text-base-content/70">{description}</p>
            <p className="mt-3 text-sm text-base-content/55">
              آخرین به‌روزرسانی: ۳ اکتبر ۲۰۲۶
            </p>
          </header>

          <div className="space-y-8 leading-8 [&_a]:text-primary [&_a]:underline [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mb-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pr-6">
            {children}
          </div>
        </div>

        <footer className="flex flex-wrap justify-center gap-4 py-6 text-sm text-base-content/65">
          <Link to="/privacy" className="hover:text-base-content">
            حریم خصوصی
          </Link>
          <Link to="/terms-and-conditions" className="hover:text-base-content">
            شرایط استفاده
          </Link>
          <a
            href="mailto:seomachine@info.ir"
            className="hover:text-base-content"
          >
            تماس با پشتیبانی
          </a>
        </footer>
      </article>
    </main>
  );
}
