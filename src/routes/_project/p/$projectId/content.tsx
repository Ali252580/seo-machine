import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { createSamSession } from "@/serverFunctions/sam";
import { sendSamVercelMessage } from "@/serverFunctions/samVercel";
import {
  getWordPressStatus,
  saveWordPressDraft,
} from "@/serverFunctions/wordpress";

export const Route = createFileRoute("/_project/p/$projectId/content")({
  component: ContentEditor,
});

const localDraft = z.object({
  keyword: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  kind: z.enum(["page", "post"]).optional(),
});

function ContentEditor() {
  const { projectId } = Route.useParams();
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<"page" | "post">("page");
  const [loaded, setLoaded] = useState(false);
  const storageKey = `openseo-article-${projectId}`;
  const wordpress = useQuery({
    queryKey: ["wordpress-connection", projectId],
    queryFn: () => getWordPressStatus({ data: { projectId } }),
  });

  useEffect(() => {
    try {
      const saved = localDraft.safeParse(
        JSON.parse(localStorage.getItem(storageKey) ?? "null"),
      );
      if (saved.success) {
        setKeyword(saved.data.keyword);
        setTitle(saved.data.title);
        setSlug(saved.data.slug);
        setContent(saved.data.content);
        setKind(saved.data.kind ?? "page");
      }
    } catch {
      /* A damaged local draft should not block the editor. */
    }
    setLoaded(true);
  }, [storageKey]);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(
        storageKey,
        JSON.stringify({ keyword, title, slug, content, kind }),
      );
  }, [loaded, storageKey, keyword, title, slug, content, kind]);

  const generate = useMutation({
    mutationFn: async () => {
      const session = await createSamSession({ data: { projectId } });
      return sendSamVercelMessage({
        data: {
          projectId,
          sessionId: session.id,
          article: true,
          text: `برای کلمهٔ «${keyword}» و عنوان «${title}» یک مقالهٔ خدماتی دقیق و قابل ویرایش بنویس. پیش از نوشتن سایت پروژه و صفحه‌های موجود مرتبط را بررسی کن. ادعای بدون منبع، قیمت ساختگی و متن عمومی ننویس. فقط HTML مقاله را بده.`,
        },
      });
    },
    onSuccess: (result) => setContent(result.assistantMessage.content),
  });
  const save = useMutation({
    mutationFn: () =>
      saveWordPressDraft({ data: { projectId, title, slug, content, kind } }),
  });
  const canWrite = wordpress.data?.canManage === true;
  const articleText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = articleText ? articleText.split(" ").length : 0;

  return (
    <main className="h-full overflow-auto p-4 md:p-7" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">نگارش محتوا با SAM</h1>
            <p className="text-sm text-base-content/60">
              بنویسید، بازبینی کنید و پیش‌نویس را به وردپرس بفرستید.
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
        {!wordpress.data?.connection && (
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
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="مثلاً اجرای روف گاردن در تهران"
              />
            </label>
            <label className="grid gap-1 text-sm">
              عنوان صفحه
              <input
                className="input input-bordered w-full"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
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
                dir="ltr"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="ejraye-roof-garden-tehran"
              />
            </label>
            <label className="grid gap-1 text-sm">
              نوع محتوا
              <select
                className="select select-bordered w-full"
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value === "post" ? "post" : "page")
                }
              >
                <option value="page">صفحهٔ خدمات</option>
                <option value="post">مقالهٔ وبلاگ</option>
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!keyword.trim() || !title.trim() || generate.isPending}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? "در حال نگارش…" : "تولید پیش‌نویس با SAM"}
            </button>
            {generate.isError && (
              <p role="alert" className="text-error text-sm">
                تولید مقاله انجام نشد. اتصال یا اعتبار SAM را بررسی کنید.
              </p>
            )}
            <label className="grid gap-1 text-sm">
              متن مقاله (HTML ساده)
              <textarea
                className="textarea textarea-bordered min-h-96 w-full font-mono text-sm"
                dir="rtl"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="<h2>عنوان بخش</h2><p>متن…</p>"
              />
            </label>
            <p className="text-xs text-base-content/60">
              متن روی همین دستگاه ذخیره می‌شود. فقط برچسب‌های سادهٔ مقاله برای
              وردپرس پذیرفته می‌شوند.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={
                !canWrite ||
                !wordpress.data?.connection ||
                save.isPending ||
                content.length < 200
              }
              onClick={() => save.mutate()}
            >
              {save.isPending ? "در حال ذخیره…" : "ذخیرهٔ پیش‌نویس در وردپرس"}
            </button>
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
          <section className="rounded-xl border border-base-300 p-4">
            <h2 className="mb-3 font-medium">پیش‌نمایش مقاله</h2>
            <div className="mb-4 grid gap-1 rounded-lg bg-base-200 p-3 text-xs text-base-content/70">
              <span>{wordCount.toLocaleString("fa-IR")} واژه</span>
              <span>
                {keyword && title.includes(keyword)
                  ? "✓ کلمهٔ هدف در عنوان است"
                  : "کلمهٔ هدف را در عنوان بررسی کنید"}
              </span>
              <span>
                {keyword && articleText.includes(keyword)
                  ? "✓ کلمهٔ هدف در متن است"
                  : "ارتباط متن با کلمهٔ هدف را بررسی کنید"}
              </span>
              <span>
                {/<h2>/i.test(content)
                  ? "✓ متن دارای تیتر بخش است"
                  : "برای بخش‌های مقاله تیتر بگذارید"}
              </span>
            </div>
            <iframe
              title="پیش‌نمایش مقاله"
              sandbox=""
              className="min-h-[650px] w-full rounded-lg border border-base-300 bg-white"
              srcDoc={`<html lang="fa" dir="rtl"><meta charset="utf-8"><style>body{font:16px/2 sans-serif;padding:24px;color:#17222f}h2,h3{line-height:1.5}</style>${content}</html>`}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
