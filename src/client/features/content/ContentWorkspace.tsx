import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
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
          className="space-y-3 rounded-xl border border-base-300 p-5"
        >
          <h2 className="text-lg font-bold">پیش‌نویس‌های قبلی</h2>
          <p className="text-sm">
            ذخیره‌شده در همین مرورگر؛ ممکن است هنوز در سایت منتشر نشده باشند.
            افزودن قابلیت لینک‌سازی، متن قدیمی را خودکار تغییر نمی‌دهد.
          </p>
          {storageError && (
            <p role="alert">
              دسترسی به ذخیره‌سازی مرورگر ممکن نشد؛ پیش‌نویس‌ها حذف نشده‌اند.
            </p>
          )}
          {!drafts.length && !storageError && (
            <p>پیش‌نویس قبلی در این مرورگر پیدا نشد.</p>
          )}
          <ul className="space-y-2">
            {drafts.map((draft, index) => (
              <li key={`${draft.page ?? draft.draft}-${index}`}>
                <Link
                  className="link"
                  to={to}
                  params={{ projectId }}
                  search={{ ...draft, title: draft.title.slice(0, 180) }}
                >
                  {draft.title} — بازکردن و ویرایش
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
