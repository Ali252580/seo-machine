import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  generateArticleImage,
  uploadReviewedArticleImage,
} from "@/serverFunctions/articleImage";
import {
  buildElementorTemplate,
  readElementorTemplate,
} from "./elementorTemplate";

export type ArticleImage = {
  id: number;
  url: string;
  preview: string;
  mediaType: string;
  alt: string;
};

export function ArticleMediaPanel({
  projectId,
  title,
  keyword,
  slug,
  kind,
  content,
  image,
  onImage,
  onImport,
  canUpload,
}: {
  projectId: string;
  title: string;
  keyword: string;
  slug: string;
  kind: "page" | "post";
  content: string;
  image: ArticleImage | null;
  onImage: (image: ArticleImage | null) => void;
  onImport: (article: ReturnType<typeof readElementorTemplate>) => void;
  canUpload: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [alt, setAlt] = useState("");
  const [exportError, setExportError] = useState("");
  const generate = useMutation({
    mutationFn: () =>
      generateArticleImage({
        data: {
          projectId,
          prompt:
            prompt.trim() ||
            `تصویرسازی حرفه‌ای برای مقالهٔ «${title}» دربارهٔ ${keyword}. بدون نوشته، لوگو یا ادعای ساختگی.`,
          altText: alt.trim() || title.trim(),
        },
      }),
    onSuccess: (result) =>
      onImage({
        ...result,
        mediaType: result.mediaType ?? "image/jpeg",
        alt: alt.trim() || title.trim(),
      }),
  });
  const upload = useMutation({
    mutationFn: () =>
      uploadReviewedArticleImage({
        data: {
          projectId,
          image: image?.preview ?? "",
          altText: alt.trim() || image?.alt || title.trim(),
        },
      }),
    onSuccess: (media) => {
      if (image) onImage({ ...image, ...media, preview: media.url });
    },
  });

  function exportTemplate() {
    try {
      const template = buildElementorTemplate({
        title,
        kind,
        content,
        image: image?.url ? { id: image.id, url: image.url } : undefined,
      });
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(template, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug || "openseo-article"}-elementor.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setExportError("");
    } catch {
      setExportError(
        "برای خروجی Elementor، عنوان و متن مقاله را کامل کنید و فقط از HTML سادهٔ مجاز استفاده کنید.",
      );
    }
  }

  async function importTemplate(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("Template too large");
      onImport(readElementorTemplate(await file.text()));
      setExportError("");
    } catch {
      setExportError(
        "این قالب با ساختار سادهٔ خروجی OpenSEO سازگار نیست. هیچ محتوایی تغییر نکرد.",
      );
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-base-300 p-4">
      <h2 className="font-medium">تصویر مقاله و خروجی Elementor</h2>
      <p className="text-xs text-base-content/70">
        توصیف تصویر را بازبینی کنید. تصویر ساخته‌شده یک دارایی گرافیکی است؛ برای
        عکس واقعی از محصول یا پروژهٔ مشتری استفاده کنید.
      </p>
      <label className="grid gap-1 text-sm">
        توصیف تصویر برای هوش مصنوعی
        <textarea
          className="textarea textarea-bordered min-h-20 w-full"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={`تصویر حرفه‌ای مرتبط با «${title || "موضوع مقاله"}»، بدون نوشته و لوگو`}
        />
      </label>
      <label className="grid gap-1 text-sm">
        متن جایگزین تصویر
        <input
          className="input input-bordered w-full"
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          placeholder={title || "توصیف دقیق محتوای تصویر"}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline"
          disabled={generate.isPending || title.trim().length < 5}
          onClick={() => generate.mutate()}
        >
          {generate.isPending
            ? "در حال ساخت تصویر…"
            : "ساخت تصویر با اعتبار پکیج"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!content.trim() || !title.trim()}
          onClick={exportTemplate}
        >
          دریافت JSON قابل ویرایش در Elementor
        </button>
        <label className="btn btn-outline">
          واردکردن JSON همین مقاله
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(event) => {
              void importTemplate(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {generate.isError && (
        <p role="alert" className="text-error text-sm">
          ساخت تصویر انجام نشد. اعتبار پکیج و کلید OpenRouter را بررسی کنید.
        </p>
      )}
      {upload.isError && (
        <p role="alert" className="text-error text-sm">
          بارگذاری تصویر انجام نشد. اتصال وردپرس و دسترسی رسانه را بررسی کنید.
        </p>
      )}
      {exportError && (
        <p role="alert" className="text-error text-sm">
          {exportError}
        </p>
      )}
      {image && (
        <div className="space-y-2">
          <img
            src={image.preview}
            alt={image.alt}
            className="max-h-72 rounded-lg object-contain"
          />
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              className="link"
              href={image.preview}
              download={`article-image.${image.mediaType.split("/")[1] || "jpg"}`}
            >
              دریافت تصویر
            </a>
            {image.url && (
              <span>
                در رسانهٔ وردپرس ذخیره شد و در خروجی JSON قرار می‌گیرد.
              </span>
            )}
            {!image.url && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                disabled={upload.isPending || !canUpload}
                onClick={() => upload.mutate()}
              >
                {upload.isPending
                  ? "در حال بارگذاری…"
                  : "پس از بازبینی، ذخیره در رسانهٔ وردپرس"}
              </button>
            )}
            {!image.url && !canUpload && (
              <span>
                برای افزودن تصویر به قالب، آن را دانلود و در رسانهٔ وردپرس
                بارگذاری کنید.
              </span>
            )}
            <button
              type="button"
              className="link text-error"
              onClick={() => onImage(null)}
            >
              حذف از پیش‌نویس
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-base-content/60">
        JSON را در کتابخانهٔ قالب‌های Elementor وارد کنید و عناصر متن و تصویر را
        ویرایش کنید. تصویر تا زمان بارگذاری در وردپرس فقط در همین نشست می‌ماند.
        این کار صفحهٔ موجود را خودکار بازنویسی یا منتشر نمی‌کند.
      </p>
    </section>
  );
}
