import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { importClusterPages } from "@/serverFunctions/contentClusters";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { DiscoveredClusterPage } from "@/shared/contentClusters";

export function ClusterFileUpload({
  projectId,
  onPages,
}: {
  projectId: string;
  onPages: (pages: DiscoveredClusterPage[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const client = useQueryClient();
  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !/\.(xml|csv)$/i.test(file.name))
        throw new Error("فایل XML یا CSV انتخاب کنید.");
      if (file.size > 2_000_000)
        throw new Error("حداکثر اندازهٔ فایل ۲ مگابایت است.");
      return importClusterPages({
        data: {
          projectId,
          text: await file.text(),
          format: /\.xml$/i.test(file.name) ? "xml" : "csv",
        },
      });
    },
    onSuccess: (result) => {
      onPages(result.pages);
      void client.invalidateQueries({
        queryKey: ["contentClusters", projectId],
      });
      void client.invalidateQueries({ queryKey: ["writingPages", projectId] });
    },
  });
  return (
    <details className="rounded-lg border border-dashed border-base-300 p-4">
      <summary className="cursor-pointer font-medium">
        بارگذاری سایت‌مپ یا خروجی Screaming Frog
      </summary>
      <p className="my-3 text-sm leading-7 text-base-content/70">
        سایت‌مپ صفحات با فرمت XML یا خروجی Internal → HTML → Export با فرمت CSV
        و رمزگذاری UTF-8 را انتخاب کنید. ستون Address نشانی و Title 1 عنوان صفحه
        است. حداکثر ۲ مگابایت و ۲۰۰ صفحه در هر بار؛ فایل‌های XLSX و ZIP پشتیبانی
        نمی‌شوند.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".xml,.csv"
          aria-label="فایل سایت‌مپ یا خروجی اسکریمینگ فراگ"
          className="file-input file-input-bordered w-full sm:w-auto"
          disabled={upload.isPending}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            upload.reset();
          }}
        />
        <button
          type="button"
          className="btn btn-outline"
          disabled={!file || upload.isPending}
          onClick={() => upload.mutate()}
        >
          <Upload size={16} aria-hidden="true" />
          {upload.isPending ? "در حال ورود و ذخیره…" : "افزودن صفحات فایل"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-6">
        صفحات همین دامنه به فهرست قبلی اضافه می‌شوند. عنوان‌های XML از نشانی
        ساخته می‌شوند؛ برای عنوان واقعی از CSV استفاده کنید. ورود فایل به معنی
        تأیید ارتباط موضوعی یا سلامت فعلی صفحات نیست. ذخیره به دسترسی مدیر پروژه
        نیاز دارد.
      </p>
      {upload.error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {getStandardErrorMessage(upload.error)}
        </p>
      )}
      {upload.isSuccess && (
        <p role="status" className="mt-3 text-sm text-success">
          {upload.data.pages.length} صفحه وارد و ذخیره شد؛ {upload.data.skipped}{" "}
          ردیف تکراری، خارج از دامنه یا نامعتبر کنار گذاشته شد. اکنون گروه‌ها را
          بررسی کنید.
        </p>
      )}
    </details>
  );
}
