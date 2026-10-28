import {
  writingProfiles,
  resolveWritingProfile,
  type WritingProfile,
} from "./writingProfiles";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArticleResearchSummary } from "@/client/features/content/ArticleResearchSummary";
import { ArticlePreview } from "@/client/features/content/ArticlePreview";
import { ArticleMediaPanel } from "@/client/features/content/ArticleMediaPanel";
import { useArticleDraft } from "@/client/features/content/useArticleDraft";
import { ContentEditorHeader } from "@/client/features/content/ContentEditorHeader";
import { buildArticlePrompt } from "@/client/features/content/buildArticlePrompt";
import { articleHtml } from "@/client/features/content/articleChatUtils";
import { researchContentTarget } from "@/serverFunctions/contentResearch";
import { createSamSession } from "@/serverFunctions/sam";
import { sendSamVercelMessage } from "@/serverFunctions/samVercel";
import {
  getWordPressStatus,
  saveWordPressDraft,
} from "@/serverFunctions/wordpress";

export function ProjectContentEditor({
  projectId,
  targetPage,
  suggestedTitle,
  blog = false,
}: {
  projectId: string;
  targetPage?: string;
  suggestedTitle?: string;
  blog?: boolean;
}) {
  const {
    brief,
    setBrief,
    profile,
    setProfile,
    keyword,
    setKeyword,
    title,
    setTitle,
    slug,
    setSlug,
    content,
    setContent,
    kind: savedKind,
    setKind,
    image,
    setImage,
  } = useArticleDraft(projectId, targetPage, suggestedTitle, blog);
  const kind = blog ? "post" : savedKind;
  useEffect(() => {
    if (blog) return;
    const key = `openseo-article-import-${projectId}`;
    const imported = sessionStorage.getItem(key);
    if (!imported) return;
    sessionStorage.removeItem(key);
    setContent(imported);
  }, [projectId, blog, setContent]);
  const [checkedTarget, setCheckedTarget] = useState<string | null>(null);
  const [research, setResearch] = useState<
    Awaited<ReturnType<typeof researchContentTarget>> | undefined
  >();
  const [matchingPages, setMatchingPages] = useState<
    {
      id: number;
      link: string;
      title: { rendered: string };
      status: string;
      kind?: "page" | "post";
    }[]
  >([]);
  const target = `${keyword.trim()}|${title.trim()}|${slug.trim()}|${kind}`;
  const wordpress = useQuery({
    queryKey: ["wordpress-connection", projectId],
    queryFn: () => getWordPressStatus({ data: { projectId } }),
  });

  const generate = useMutation({
    mutationFn: async () => {
      setCheckedTarget(null);
      // Research is a server-side prerequisite, not a claim made by the model.
      const evidence = await researchContentTarget({
        data: {
          projectId,
          keyword: keyword.trim(),
          title: title.trim(),
          targetPage,
        },
      });
      setResearch(evidence);
      setMatchingPages(evidence.pages);
      const session = await createSamSession({ data: { projectId } });
      const result = await sendSamVercelMessage({
        data: {
          projectId,
          sessionId: session.id,
          article: true,
          text: buildArticlePrompt(
            keyword,
            title,
            evidence,
            kind,
            profile,
            brief,
          ),
        },
      });
      return {
        result,
        checkedTarget: evidence.wordpressChecked ? target : null,
      };
    },
    onSuccess: ({ result, checkedTarget: verifiedTarget }) => {
      setContent(
        articleHtml(result.assistantMessage.content) ??
          result.assistantMessage.content,
      );
      setCheckedTarget(verifiedTarget);
    },
  });
  const save = useMutation({
    mutationFn: () =>
      saveWordPressDraft({ data: { projectId, title, slug, content, kind } }),
  });
  const canWrite = wordpress.data?.canManage === true;
  // A generated local draft is not clearance to create another CMS item.
  // Saving requires a current duplicate check with no matching content.
  const canCreateNewDraft =
    !targetPage &&
    canWrite &&
    checkedTarget === target &&
    matchingPages.length === 0;
  const articleText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = articleText ? articleText.split(" ").length : 0;
  const distinctSections = new Set(
    [...content.matchAll(/<h2>(.*?)<\/h2>/gis)]
      .map((match) => match[1].replace(/<[^>]*>/g, "").trim())
      .filter(Boolean),
  ).size;

  return (
    <main className="h-full overflow-auto p-4 md:p-7" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-5">
        <ContentEditorHeader
          projectId={projectId}
          targetPage={targetPage}
          blog={blog}
        />
        <section
          className="rounded-xl border border-base-300 bg-base-200/40 p-4 text-sm"
          aria-label="راهنمای تصمیم‌گیری نگارش محتوا"
        >
          <h2 className="text-base font-semibold">
            چه زمانی مقالهٔ تازه می‌نویسیم و چه زمانی صفحه را بهبود می‌دهیم؟
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <p className="font-medium">۱. شواهد را جمع می‌کنیم</p>
              <p className="mt-1 text-base-content/70">
                صفحه‌های موجود وردپرس، عبارت‌ها و کلیک‌های سرچ کنسول، رتبهٔ
                ثبت‌شدهٔ کلمه و نتیجهٔ صفحه در آنالیتیکس بررسی می‌شوند. هر منبعی
                که وصل نباشد، ناموجود نشان داده می‌شود.
              </p>
            </div>
            <div>
              <p className="font-medium">۲. نوع اقدام را مشخص می‌کنیم</p>
              <p className="mt-1 text-base-content/70">
                اگر صفحهٔ مرتبط وجود داشته باشد، ابتدا کمبودهای همان صفحه و قصد
                جست‌وجو را بررسی می‌کنیم. برای موضوع بدون صفحه، پیش‌نویس تازه
                تنها پس از بررسی هم‌پوشانی پیشنهاد می‌شود. افت رتبه به‌تنهایی
                دلیل بازنویسی نیست.
              </p>
            </div>
            <div>
              <p className="font-medium">۳. پیش‌نویس را بازبینی می‌کنید</p>
              <p className="mt-1 text-base-content/70">
                SAM با راهنمای مهارت‌های سئو متن قابل ویرایش می‌نویسد. پس از
                نگارش، دلیل پیشنهاد و عددهای پشت آن پایین فرم دیده می‌شود؛ متن
                بدون بررسی شما منتشر نمی‌شود.
              </p>
            </div>
          </div>
        </section>
        {!targetPage && !wordpress.data?.connection && (
          <p className="alert alert-info text-sm">
            برای ارسال پیش‌نویس، مدیر پروژه باید{" "}
            <Link
              to="/p/$projectId/settings/integrations"
              params={{ projectId }}
              className="link"
            >
              وردپرس را وصل کند
            </Link>
            . نگارش داخل سایت همین حالا قابل استفاده است.
          </p>
        )}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="space-y-3 rounded-xl border border-base-300 p-4">
            <label className="grid gap-1 text-sm">
              کلمهٔ کلیدی هدف
              <input
                className="input input-bordered w-full"
                disabled={generate.isPending}
                value={keyword}
                maxLength={100}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setMatchingPages([]);
                  setResearch(undefined);
                  setCheckedTarget(null);
                }}
                placeholder="کلمهٔ کلیدی مرتبط با این پروژه"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {blog ? "عنوان مقالهٔ وبلاگ" : "عنوان صفحه"}
              <input
                className="input input-bordered w-full"
                disabled={generate.isPending}
                value={title}
                maxLength={180}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setMatchingPages([]);
                  setResearch(undefined);
                  setCheckedTarget(null);
                  if (!slug)
                    setSlug(event.target.value.trim().replace(/\s+/g, "-"));
                }}
                placeholder="عنوان دقیق و متناسب با قصد جست‌وجو"
              />
            </label>
            <label className="grid gap-1 text-sm">
              نشانی کوتاه
              <input
                className="input input-bordered w-full"
                disabled={generate.isPending}
                dir="ltr"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder={blog ? "blog-article" : "service-page"}
              />
            </label>
            {!blog && (
              <label className="grid gap-1 text-sm">
                نوع محتوا
                <select
                  className="select select-bordered w-full"
                  disabled={generate.isPending}
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value === "post" ? "post" : "page")
                  }
                >
                  <option value="page">مقالهٔ مرجع یا صفحهٔ سایت</option>
                  <option value="post">مقالهٔ وبلاگ</option>
                </select>
              </label>
            )}
            <label className="grid gap-1 text-sm">
              قالب تخصصی نگارش
              <select
                className="select select-bordered w-full"
                value={resolveWritingProfile(kind, profile)}
                disabled={generate.isPending}
                onChange={(event) =>
                  setProfile(event.target.value as WritingProfile)
                }
              >
                {Object.entries(writingProfiles)
                  .filter(([, option]) => option.kind === kind)
                  .map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>
            <p className="text-sm leading-7 text-base-content/70">
              {writingProfiles[resolveWritingProfile(kind, profile)].prompt}
            </p>
            <label className="grid gap-1 text-sm">
              مخاطب، هدف و شواهد اختصاصی مقاله
              <textarea
                className="textarea textarea-bordered w-full"
                maxLength={400}
                value={brief}
                disabled={generate.isPending}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="مخاطب چه کسی است؟ چه چیزی باید یاد بگیرد یا تصمیم بگیرد؟ چه اطلاعات یا تجربهٔ مستندی دارید؟"
              />
              <span className="text-xs text-base-content/60">
                این یادداشت همراه زمینهٔ همین پروژه استفاده می‌شود.{" "}
                {brief.length}/۴۰۰
              </span>
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                keyword.trim().length < 2 ||
                title.trim().length < 5 ||
                generate.isPending
              }
              onClick={() => generate.mutate()}
            >
              {generate.isPending
                ? "در حال بررسی و نگارش…"
                : targetPage
                  ? "تحلیل صفحه و نگارش بهبود با SAM"
                  : blog
                    ? "بررسی موضوع و نگارش وبلاگ"
                    : "تولید پیش‌نویس با SAM"}
            </button>
            {generate.isError && (
              <p role="alert" className="text-error text-sm">
                بررسی شواهد یا نگارش انجام نشد. اتصال وردپرس، ابزارهای گوگل و
                اعتبار SAM را بررسی کنید.
              </p>
            )}
            {research && <ArticleResearchSummary evidence={research} />}
            {matchingPages.length > 0 && (
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
                <p className="font-medium">
                  محتوای مرتبط در وردپرس پیدا شد. ساخت پیش‌نویس تازه برای این
                  موضوع بسته است؛ متن تولیدشده را برای بهبود صفحهٔ موجود بازبینی
                  کنید:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {matchingPages.slice(0, 8).map((page) => (
                    <li key={page.id}>
                      <a
                        href={page.link}
                        target="_blank"
                        rel="noreferrer"
                        className="link"
                      >
                        {page.title.rendered || page.link}
                      </a>{" "}
                      ({page.kind === "post" ? "نوشته" : "برگه"}، {page.status})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label className="grid gap-1 text-sm">
              متن مقاله (HTML ساده)
              <textarea
                className="textarea textarea-bordered min-h-96 w-full font-mono text-sm"
                dir="rtl"
                disabled={generate.isPending}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="<h2>عنوان بخش</h2><p>متن…</p>"
              />
            </label>
            <p className="text-xs text-base-content/60">
              متن روی همین دستگاه ذخیره می‌شود. فقط برچسب‌های سادهٔ مقاله برای
              وردپرس پذیرفته می‌شوند. ذخیره به دست‌کم ۱۸۰ واژه و دو بخش با تیتر
              متفاوت نیاز دارد؛ صحت و ارزش افزودهٔ متن را نیز بازبینی کنید.
            </p>
            <ArticleMediaPanel
              projectId={projectId}
              title={title}
              keyword={keyword}
              slug={slug}
              kind={kind}
              content={content}
              image={image}
              onImage={setImage}
              canUpload={canWrite && Boolean(wordpress.data?.connection)}
              onImport={(article) => {
                setTitle(article.title);
                setKind(blog ? "post" : article.kind);
                setContent(article.content);
                setImage(
                  article.image
                    ? {
                        ...article.image,
                        preview: article.image.url,
                        mediaType: "image/jpeg",
                        alt: article.title,
                      }
                    : null,
                );
                setCheckedTarget(null);
              }}
            />
            {targetPage ? (
              <p className="text-sm text-base-content/70">
                {
                  "متن پیشنهادی را بازبینی کنید و در ویرایشگر همان صفحهٔ وردپرس جای‌گذاری کنید. این بخش صفحهٔ تازه‌ای منتشر نمی‌کند."
                }
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={
                  !canCreateNewDraft ||
                  !wordpress.data?.connection ||
                  save.isPending ||
                  wordCount < 180 ||
                  distinctSections < 2
                }
                onClick={() => save.mutate()}
              >
                {save.isPending ? "در حال ذخیره…" : "ذخیرهٔ پیش‌نویس در وردپرس"}
              </button>
            )}
            {save.isSuccess && (
              <p role="status" className="text-sm">
                {save.data.existing
                  ? "محتوایی با همین نشانی یا عنوان وجود دارد؛ مورد تازه ساخته نشد."
                  : "پیش‌نویس در وردپرس ساخته شد."}{" "}
                <a
                  className="link"
                  href={`${wordpress.data?.connection?.siteUrl}/wp-admin/post.php?post=${save.data.page.id}&action=edit`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ویرایش در وردپرس
                </a>
              </p>
            )}
            {save.isError && (
              <p role="alert" className="text-error text-sm">
                ذخیره انجام نشد. اتصال و متن مقاله را بررسی کنید.
              </p>
            )}
          </section>
          <ArticlePreview
            content={content}
            keyword={keyword}
            title={title}
            articleText={articleText}
            wordCount={wordCount}
          />
        </div>
      </div>
    </main>
  );
}
