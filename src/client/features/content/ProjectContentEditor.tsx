import {
  writingProfiles,
  resolveWritingProfile,
  type WritingProfile,
} from "./writingProfiles";
import { Link } from "@tanstack/react-router";
import { ArticleGenerationStatus } from "./ArticleGenerationStatus";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArticleResearchSummary } from "@/client/features/content/ArticleResearchSummary";
import { ArticleClusterSummary } from "./ArticleClusterSummary";
import { WritingPagePicker } from "./WritingPagePicker";
import { ArticlePreview } from "@/client/features/content/ArticlePreview";
import { ArticleTextEditor } from "./ArticleTextEditor";
import { confirmArticleReplacement } from "./confirmArticleReplacement";
import { ArticleMediaPanel } from "@/client/features/content/ArticleMediaPanel";
import { useArticleDraft } from "@/client/features/content/useArticleDraft";
import { ContentEditorHeader } from "@/client/features/content/ContentEditorHeader";
import { buildArticlePrompt } from "@/client/features/content/buildArticlePrompt";
import { requireGeneratedArticle } from "@/client/features/content/articleChatUtils";
import {
  checkTopicCoverage,
  researchContentTarget,
} from "@/serverFunctions/contentResearch";
import { getSerpAnalysis } from "@/serverFunctions/keywords";
import { useProjectMarket } from "@/client/features/projects/useProjectMarket";
import { sameSitePage } from "@/shared/contentClusters";
import { findOwnSearchResults } from "./articleSearchEvidence";
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
  suggestedKeyword,
  blog = false,
  draftId,
}: {
  projectId: string;
  targetPage?: string;
  suggestedTitle?: string;
  suggestedKeyword?: string;
  blog?: boolean;
  draftId?: string;
}) {
  const project = useProjectMarket(projectId);
  const {
    storageError,
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
  } = useArticleDraft(
    projectId,
    targetPage,
    suggestedTitle,
    blog,
    draftId,
    suggestedKeyword,
  );
  const kind = blog ? "post" : savedKind;
  useEffect(() => {
    if (blog) return;
    const key = `openseo-article-import-${projectId}`;
    try {
      const imported = sessionStorage.getItem(key);
      if (!imported) return;
      sessionStorage.removeItem(key);
      setContent(imported);
    } catch {
      // Restricted browser storage must not prevent manual article editing.
    }
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

  const [generationStage, setGenerationStage] = useState("بررسی شواهد");
  const [coverageMatches, setCoverageMatches] = useState<
    { title: string; url: string }[]
  >([]);
  const [serpUnavailable, setSerpUnavailable] = useState(false);
  const [coverageUnavailable, setCoverageUnavailable] = useState(false);
  const generate = useMutation({
    mutationFn: async () => {
      setCheckedTarget(null);
      setResearch(undefined);
      setCoverageMatches([]);
      setSerpUnavailable(false);
      setCoverageUnavailable(false);
      setGenerationStage("بررسی شواهد");
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
      let serp: Awaited<ReturnType<typeof getSerpAnalysis>>["items"] = [];
      let coverageVerified = true;
      if (!targetPage) {
        const [keywordCoverage, titleCoverage] = await Promise.all([
          checkTopicCoverage({ data: { projectId, keyword: keyword.trim() } }),
          checkTopicCoverage({
            data: { projectId, keyword: title.trim().slice(0, 100) },
          }),
        ]);
        coverageVerified =
          keywordCoverage.checked &&
          titleCoverage.checked &&
          Boolean(project?.domain);
        setCoverageUnavailable(!coverageVerified);
        const matches = [
          ...new Map(
            [...keywordCoverage.pages, ...titleCoverage.pages].map((page) => [
              page.url,
              page,
            ]),
          ).values(),
        ];
        setCoverageMatches(matches);
        if (matches.length)
          throw new Error(
            "صفحهٔ مرتبطی پیدا شد؛ پیش از ایجاد مقالهٔ جدید، صفحه‌های زیر را بررسی کنید.",
          );
        if (kind === "post") {
          setGenerationStage("بررسی نتایج گوگل");
          try {
            const results = await getSerpAnalysis({
              data: { projectId, keyword: keyword.trim(), depth: 20 },
            });
            serp = results.items;
            setSerpUnavailable(!serp.length);
          } catch {
            setSerpUnavailable(true);
          }
          const ownResults = findOwnSearchResults(serp, project?.domain ?? "");
          if (ownResults.length) {
            setCoverageMatches(ownResults);
            throw new Error(
              "این سایت برای کلمهٔ هدف در نتایج گوگل دیده شد؛ ابتدا صفحهٔ موجود را بررسی کنید.",
            );
          }
        }
      }
      setGenerationStage("ساخت نشست SAM");
      const session = await createSamSession({ data: { projectId } });
      setGenerationStage("نگارش با SAM");
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
            serp,
          ),
        },
      });
      return {
        content: requireGeneratedArticle(result.assistantMessage.content),
        checkedTarget:
          evidence.wordpressChecked && coverageVerified ? target : null,
      };
    },
    onSuccess: ({
      content: generatedContent,
      checkedTarget: verifiedTarget,
    }) => {
      setContent(generatedContent);
      setCheckedTarget(verifiedTarget);
    },
  });
  const save = useMutation({
    mutationFn: () =>
      saveWordPressDraft({
        data: {
          projectId,
          title,
          slug,
          content,
          kind,
          keyword: keyword.trim(),
        },
      }),
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
        <Link
          className="btn btn-sm btn-outline"
          to={blog ? "/p/$projectId/blog" : "/p/$projectId/content"}
          params={{ projectId }}
          search={{}}
        >
          بازگشت به پیشنهادها و پیش‌نویس‌های قبلی
        </Link>
        {content && !/<a\s[^>]*href=/i.test(content) && (
          <p className="alert alert-info text-sm">
            در این پیش‌نویس لینکی پیدا نشد. متن‌های قبلی خودکار تغییر نمی‌کنند؛
            برای بررسی مقصدهای فعلی و افزودن لینک در متن، دکمهٔ نگارش مجدد را
            بزنید و نتیجه را بازبینی کنید.
          </p>
        )}
        {!blog && (
          <WritingPagePicker projectId={projectId} targetPage={targetPage} />
        )}
        <nav
          aria-label="بخش‌های نگارش مقاله"
          className="flex flex-wrap gap-2 text-sm"
        >
          <a href="#article-form" className="btn btn-sm btn-outline">
            ۱. موضوع و نگارش
          </a>
          <a href="#article-preview" className="btn btn-sm btn-outline">
            ۲. بازبینی پیش‌نویس
          </a>
          <a href="#article-delivery" className="btn btn-sm btn-outline">
            ۳. خروجی و ارسال
          </a>
        </nav>
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
        {wordpress.isError && (
          <div role="alert" className="alert alert-warning text-sm">
            <span>
              وضعیت اتصال وردپرس دریافت نشد. پیش‌نویس را می‌توانید همین‌جا
              بنویسید.
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void wordpress.refetch()}
            >
              بررسی دوبارهٔ اتصال
            </button>
          </div>
        )}
        {!targetPage && wordpress.isSuccess && !wordpress.data?.connection && (
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
          <section
            id="article-form"
            className="min-w-0 scroll-mt-4 space-y-3 rounded-xl border border-base-300 p-4"
          >
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
                  setCoverageMatches([]);
                  setSerpUnavailable(false);
                  setCoverageUnavailable(false);
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
                  setCoverageMatches([]);
                  setSerpUnavailable(false);
                  setCoverageUnavailable(false);
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
                generate.isPending ||
                save.isPending
              }
              onClick={() => {
                if (confirmArticleReplacement(content)) generate.mutate();
              }}
            >
              {generate.isPending
                ? "در حال بررسی و نگارش…"
                : content.trim()
                  ? "نگارش مجدد با بررسی لینک‌های داخلی"
                  : targetPage
                    ? "تحلیل صفحه و نگارش بهبود با SAM"
                    : blog
                      ? "بررسی موضوع و نگارش وبلاگ"
                      : "تولید پیش‌نویس با SAM"}
            </button>
            <ArticleGenerationStatus
              pending={generate.isPending}
              success={generate.isSuccess}
              error={generate.error}
              stage={generationStage}
              serpStep={kind === "post" && !targetPage}
            />
            {kind === "post" && !targetPage && (
              <p className="text-xs text-base-content/70">
                برای نگارش، نتایج گوگل نیز بررسی می‌شود و ممکن است اعتبار مصرف
                کند.
              </p>
            )}
            {serpUnavailable && (
              <p role="status" className="text-sm">
                نتایج گوگل در دسترس نبود؛ متن بدون این شواهد تهیه می‌شود.
              </p>
            )}
            {coverageUnavailable && (
              <p role="status" className="text-sm">
                بررسی صفحات سایت کامل در دسترس نبود؛ پیش از انتشار، هم‌پوشانی را
                بررسی کنید.
              </p>
            )}
            {coverageMatches.length > 0 && (
              <div
                role="status"
                className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm leading-7"
              >
                <div>
                  <p className="font-semibold">
                    احتمال هم‌پوشانی با محتوای سایت
                  </p>
                  <p>
                    برای جلوگیری از هدف‌گیری تکراری، ابتدا صفحه‌های زیر را بررسی
                    کنید. تطابق کلمات به‌تنهایی به معنی یکسان‌بودن قصد جست‌وجو
                    نیست.
                  </p>
                </div>
                <ul className="space-y-2">
                  {coverageMatches.map((page) => (
                    <li
                      key={page.url}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-base-100 p-3"
                    >
                      {project?.domain &&
                      sameSitePage(page.url, project.domain) ? (
                        <>
                          <a
                            className="link break-words"
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {page.title || page.url}
                          </a>
                          <Link
                            className="btn btn-sm btn-outline"
                            to="/p/$projectId/content"
                            params={{ projectId }}
                            search={{
                              page: page.url,
                              title: (page.title || "").slice(0, 180),
                            }}
                          >
                            بررسی و بهبود صفحه
                          </Link>
                        </>
                      ) : (
                        page.title || "صفحهٔ مرتبط با نشانی نامعتبر"
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs">
                  اگر نیاز مخاطب متفاوت است، کلمه و عنوان دقیق‌تری انتخاب کنید و
                  دوباره بررسی را انجام دهید.
                </p>
              </div>
            )}
            <details className="rounded-lg border border-base-300 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                صفحات مرتبط و دلیل پیشنهادها
              </summary>
              <ArticleClusterSummary evidence={research} />
              {research && <ArticleResearchSummary evidence={research} />}
            </details>
            {matchingPages.length > 0 && coverageMatches.length === 0 && (
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
                <p className="font-medium">
                  محتوای مرتبط در وردپرس پیدا شد. ساخت پیش‌نویس تازه برای این
                  موضوع بسته است؛ متن تولیدشده را برای بهبود صفحهٔ موجود بازبینی
                  کنید:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {matchingPages.map((page) => (
                    <li key={`${page.kind}-${page.id}`}>
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
            <ArticleTextEditor
              value={content}
              onChange={setContent}
              disabled={generate.isPending}
            />
            {storageError && (
              <p
                role="alert"
                className="rounded-lg border border-warning/50 p-3 text-sm"
              >
                ذخیرهٔ خودکار روی این دستگاه انجام نشد. پیش از بستن صفحه، متن را
                کپی کنید یا خروجی JSON بگیرید.
              </p>
            )}
            <p className="text-xs text-base-content/60">
              ذخیرهٔ خودکار وابسته به فضای ذخیره‌سازی همین مرورگر است. فقط
              برچسب‌های سادهٔ مقاله برای وردپرس پذیرفته می‌شوند. ذخیره به دست‌کم
              ۱۸۰ واژه و دو بخش با تیتر متفاوت نیاز دارد؛ صحت و ارزش افزودهٔ متن
              را نیز بازبینی کنید.
            </p>
            <fieldset
              id="article-delivery"
              className="min-w-0 scroll-mt-4"
              disabled={generate.isPending || save.isPending}
            >
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
                  if (!confirmArticleReplacement(content)) return;
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
            </fieldset>
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
                  generate.isPending ||
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
                  ? "محتوایی مرتبط با کلمهٔ هدف، نشانی یا عنوان وجود دارد؛ مورد تازه ساخته نشد."
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
          <div id="article-preview" className="min-w-0 scroll-mt-4">
            <ArticlePreview
              content={content}
              keyword={keyword}
              title={title}
              articleText={articleText}
              wordCount={wordCount}
              generating={generate.isPending}
              generationFailed={generate.isError}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
