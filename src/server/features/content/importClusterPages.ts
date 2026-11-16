import Papa from "papaparse";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  clusterSearchTopic,
  sameSitePage,
  clusterPageSchema,
} from "@/shared/contentClusters";
import { AppError } from "@/server/lib/errors";

function invalid(message: string): never {
  throw new AppError("VALIDATION_ERROR", message);
}

export function parseClusterUpload(
  text: string,
  format: "xml" | "csv",
  domain: string,
) {
  if (new TextEncoder().encode(text).length > 2_000_000)
    invalid("حداکثر اندازهٔ فایل ۲ مگابایت است.");
  let rows: { url: string; title: string; eligible?: boolean }[];
  if (format === "xml") {
    if (
      /<!DOCTYPE|<!ENTITY/i.test(text) ||
      XMLValidator.validate(text) !== true
    )
      invalid("فایل XML معتبر نیست یا اعلان موجودیت دارد.");
    const doc = new XMLParser({
      removeNSPrefix: true,
      parseTagValue: false,
    }).parse(text);
    if (doc.sitemapindex)
      invalid(
        "این فایل فهرست سایت‌مپ‌هاست؛ یکی از فایل‌های زیرمجموعه شامل نشانی صفحات را بارگذاری کنید.",
      );
    if (!doc.urlset) invalid("فایل باید سایت‌مپ صفحات با ساختار urlset باشد.");
    const entries = doc.urlset.url ?? [];
    rows = (Array.isArray(entries) ? entries : [entries]).map((entry) => ({
      url: typeof entry.loc === "string" ? entry.loc.trim() : "",
      title: "",
    }));
  } else {
    const result = Papa.parse<Record<string, string>>(
      text.replace(/^\uFEFF/, ""),
      {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim().toLowerCase(),
      },
    );
    if (result.errors.length)
      invalid(
        "ساختار CSV معتبر نیست؛ خروجی UTF-8 با تعداد ستون‌های یکسان انتخاب کنید.",
      );
    if (
      !result.meta.fields?.some((field) => ["address", "url"].includes(field))
    )
      invalid("فایل CSV باید ستون Address یا URL داشته باشد.");
    rows = result.data.map((row) => ({
      url: (row.address || row.url || "").trim(),
      title: (row["title 1"] || row.title || "").trim(),
      eligible:
        (!row["status code"] || row["status code"].trim() === "200") &&
        (!row["content type"] ||
          /(?:text\/html|application\/xhtml\+xml)/i.test(
            row["content type"],
          )) &&
        (!row.indexability ||
          row.indexability.trim().toLowerCase() === "indexable"),
    }));
  }
  const pages = new Map<string, { url: string; title: string }>();
  let skipped = 0;
  for (const row of rows) {
    if (row.eligible === false || !sameSitePage(row.url, domain)) {
      skipped++;
      continue;
    }
    const url = new URL(row.url);
    url.hash = "";
    const page = clusterPageSchema.safeParse({
      url: url.href,
      title: (row.title || clusterSearchTopic(url.href) || url.hostname).slice(
        0,
        180,
      ),
    });
    if (!page.success || pages.has(url.href)) {
      skipped++;
      continue;
    }
    pages.set(url.href, page.data);
  }
  if (!pages.size)
    invalid("صفحهٔ معتبر متعلق به دامنهٔ همین پروژه در فایل پیدا نشد.");
  if (pages.size > 5000)
    invalid(
      "هر فایل حداکثر ۵۰۰۰ صفحه می‌تواند داشته باشد؛ فایل را به بخش‌های کوچک‌تر تقسیم کنید.",
    );
  return { pages: [...pages.values()], skipped };
}
