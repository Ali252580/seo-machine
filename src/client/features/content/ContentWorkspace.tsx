import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, FilePenLine, HardDrive } from "lucide-react";
import { getWritingPages } from "@/serverFunctions/contentClusters";
import { ContentEditorHeader } from "./ContentEditorHeader";
import { WritingPagePicker } from "./WritingPagePicker";
import { ProjectContentEditor } from "./ProjectContentEditor";
import { articleIdeas, savedDraftEntries } from "./contentWorkspaceData";

export const contentWorkspaceSearch = z.object({
  page: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value))
    .optional(),
  title: z.string().max(180).optional(),
  draft: z
    .string()
    .regex(/^(legacy|[a-f0-9-]{36})$/)
    .optional(),
});

export function ContentWorkspace({
  projectId,
  blog = false,
  search,
}: {
  projectId: string;
  blog?: boolean;
  search: z.infer<typeof contentWorkspaceSearch>;
}) {
  const navigate = useNavigate();
  const to = blog ? "/p/$projectId/blog" : "/p/$projectId/content";
  const [topic, setTopic] = useState("");
  const [drafts, setDrafts] = useState<ReturnType<typeof savedDraftEntries>>(
    [],
  );
  const [storageError, setStorageError] = useState(false);
  const pages = useQuery({
    queryKey: ["writingPages", projectId],
    queryFn: () => getWritingPages({ data: { projectId } }),
  });
  useEffect(() => {
    try {
      setDrafts(savedDraftEntries(localStorage, projectId, blog));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [projectId, blog, search.draft, search.page]);
  const start = (title: string) => {
    void navigate({
      to,
      params: { projectId },
      search: { draft: crypto.randomUUID(), title: title.slice(0, 180) },
    });
  };
  if (search.page || search.draft)
    return (
      <ProjectContentEditor
        key={`${projectId}:${search.page ?? search.draft}:${blog}`}
        projectId={projectId}
        targetPage={search.page}
        suggestedTitle={search.title}
        blog={blog}
        draftId={search.draft === "legacy" ? undefined : search.draft}
      />
    );
  return (
    <main className="h-full overflow-auto p-4 md:p-7" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <ContentEditorHeader projectId={projectId} blog={blog} />
        <nav aria-label="زیرمنوی محتوا" className="flex gap-3">
          <a href="#new-content" className="btn btn-primary btn-sm">
            پیشنهاد و محتوای جدید
          </a>
          <a href="#previous-drafts" className="btn btn-outline btn-sm">
            پیش‌نویس‌های قبلی ({drafts.length})
          </a>
        </nav>
        <section
          id="new-content"
          className="space-y-4 rounded-xl border border-base-300 p-5"
        >
          <h2 className="text-xl font-bold">
            {blog
              ? "مقالهٔ آموزشی جدید برای مخاطبان سایت"
              : "صفحهٔ جدید برای خدمات، محصول یا راهنمای مرجع"}
          </h2>
          <p className="text-sm">
            {blog
              ? "برای آموزش، پاسخ به سؤال و مقایسه بنویسید؛ هدف این بخش توضیح موضوع است، نه معرفی خدمات."
              : "برای معرفی خدمات و محصول یا ساخت مرجع اصلی موضوع بنویسید. برای اصلاح محتوای فعلی، صفحه را از فهرست پایین انتخاب کنید."}
          </p>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (topic.trim()) start(topic.trim());
            }}
          >
            <input
              className="input input-bordered flex-1"
              aria-label="موضوع محتوای جدید"
              value={topic}
              maxLength={180}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="موضوع یا عنوان جدید"
            />
            <button className="btn btn-primary" disabled={!topic.trim()}>
              شروع پیش‌نویس تازه
            </button>
          </form>
          <h3 className="font-semibold">ایده‌های اولیه از صفحات شناسایی‌شده</h3>
          {pages.isError && (
            <p role="alert">
              دریافت صفحات برای پیشنهاد موضوع انجام نشد.{" "}
              <button
                className="btn btn-sm"
                onClick={() => void pages.refetch()}
              >
                تلاش مجدد
              </button>
            </p>
          )}
          <p className="text-xs text-base-content/70">
            این‌ها زاویه‌های پیشنهادی از عنوان‌های سایت هستند؛ تقاضای جست‌وجو یا
            نبود مقالهٔ مشابه تأیید نشده است. پیش از نگارش، هم‌پوشانی بررسی
            می‌شود.
          </p>
          <ul className="space-y-2">
            {articleIdeas(pages.data ?? [], blog).map((idea) => (
              <li
                key={idea}
                className="flex flex-wrap justify-between gap-2 rounded-lg bg-base-200 p-3"
              >
                <span>{idea}</span>
                <button className="btn btn-sm" onClick={() => start(idea)}>
                  بررسی و نگارش
                </button>
              </li>
            ))}
          </ul>
          {!pages.data?.length && (
            <p className="text-sm">
              برای پیشنهاد متناسب با سایت، ابتدا صفحات را از نقشهٔ پیلار و
              کلاستر یا فهرست زیر دریافت کنید.
            </p>
          )}
        </section>
        {!blog && <WritingPagePicker projectId={projectId} />}
        <section
          id="previous-drafts"
          className="overflow-hidden rounded-xl border border-base-300 bg-base-100"
        >
          <header className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold sm:text-xl">
                پیش‌نویس‌های قبلی
              </h2>
              <p className="text-sm leading-7 text-base-content/75">
                از جایی که متوقف شدید ادامه دهید؛ پیش‌نویس را برای بازبینی و
                ویرایش باز کنید.
              </p>
            </div>
            <span className="badge badge-outline h-auto shrink-0 border-base-300 px-3 py-2 text-xs">
              {drafts.length.toLocaleString("fa-IR")} پیش‌نویس
            </span>
          </header>
          <div className="flex items-start gap-2 border-y border-base-300 bg-base-200/60 px-5 py-3 text-xs leading-6 text-base-content/75 sm:px-6">
            <HardDrive size={16} aria-hidden="true" className="mt-1 shrink-0" />
            <p>
              ذخیره‌شده در همین مرورگر؛ وضعیت انتشار در سایت از این فهرست مشخص
              نیست.
            </p>
          </div>
          {storageError && (
            <p
              role="alert"
              className="m-5 rounded-lg border border-error/40 p-4 text-sm"
            >
              دسترسی به ذخیره‌سازی مرورگر ممکن نشد؛ پیش‌نویس‌ها حذف نشده‌اند.
            </p>
          )}
          {!drafts.length && !storageError && (
            <div className="space-y-2 p-8 text-center">
              <FilePenLine
                size={28}
                aria-hidden="true"
                className="mx-auto mb-3 text-base-content/60"
              />
              <p className="font-medium">
                پیش‌نویس قبلی در این مرورگر پیدا نشد.
              </p>
              <p className="text-sm text-base-content/75">
                با شروع نگارش، پیش‌نویس شما در این بخش قرار می‌گیرد.
              </p>
            </div>
          )}
          <ul className="divide-y divide-base-300">
            {drafts.map((draft, index) => (
              <li key={`${draft.page ?? draft.draft}-${index}`}>
                <Link
                  className="group flex min-w-0 flex-col gap-3 px-5 py-4 transition-colors hover:bg-base-200/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-5 sm:px-6"
                  to={to}
                  params={{ projectId }}
                  search={{ ...draft, title: draft.title.slice(0, 180) }}
                >
                  <FilePenLine
                    size={20}
                    aria-hidden="true"
                    className="hidden shrink-0 text-base-content/60 sm:block"
                  />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="block break-words text-sm font-semibold leading-7">
                      {draft.title}
                    </span>
                    {draft.page ? (
                      <span
                        dir="ltr"
                        title={draft.page}
                        className="block truncate text-right text-xs leading-6 text-base-content/70"
                      >
                        {draft.page}
                      </span>
                    ) : (
                      <span className="block text-xs leading-6 text-base-content/70">
                        {blog ? "مقالهٔ آموزشی" : "محتوای جدید"} · بدون صفحهٔ
                        مقصد
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-base-300 px-3 py-2.5 text-xs font-medium group-hover:border-primary group-hover:text-primary sm:self-center">
                    ادامهٔ ویرایش
                    <ArrowLeft size={15} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!!drafts.length && (
            <p className="border-t border-base-300 px-5 py-3 text-xs leading-6 text-base-content/75 sm:px-6">
              برای بررسی لینک‌های داخلیِ متن قدیمی، پیش‌نویس را باز کنید و
              «نگارش مجدد با بررسی لینک‌های داخلی» را بزنید.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
