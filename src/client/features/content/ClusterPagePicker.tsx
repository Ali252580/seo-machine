import { useState } from "react";
import {
  suggestClusterPages,
  type DiscoveredClusterPage,
} from "@/shared/contentClusters";

export function ClusterPagePicker({
  pages,
  pillarUrl,
  selected,
  setPillarUrl,
  setSelected,
}: {
  pages: DiscoveredClusterPage[];
  pillarUrl: string;
  selected: string[];
  setPillarUrl: (url: string) => void;
  setSelected: (urls: string[]) => void;
}) {
  const pillar = pages.find((page) => page.url === pillarUrl);
  const [search, setSearch] = useState("");
  const visiblePages = pages.filter(
    (page) =>
      page.url !== pillarUrl &&
      `${page.title} ${page.url}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <label className="block space-y-2">
        <span>صفحهٔ پیلار (مرجع اصلی)</span>
        <select
          className="select select-bordered w-full"
          value={pillarUrl}
          onChange={(event) => {
            setPillarUrl(event.target.value);
            setSelected([]);
          }}
        >
          <option value="">انتخاب صفحهٔ مرجع</option>
          {pages.map((page) => (
            <option key={page.url} value={page.url}>
              {page.title}
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn btn-sm btn-outline"
        disabled={!pillar}
        onClick={() =>
          pillar &&
          setSelected(
            suggestClusterPages(pillar, pages).map((page) => page.url),
          )
        }
      >
        پیشنهاد زیرموضوع‌ها از عنوان‌ها
      </button>
      <p className="text-xs text-base-content/60">
        این پیشنهاد فقط از اشتراک واژه‌های عنوان است؛ تحلیل SERP نیست. ارتباط
        موضوعی را بازبینی کنید.
      </p>
      <label className="block space-y-2">
        <span>جست‌وجو در صفحات برای جایگزینی</span>
        <input
          className="input input-bordered w-full"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="عنوان یا آدرس صفحه"
        />
      </label>
      <p className="text-sm">
        برای جایگزینی، تیک پیشنهاد نامناسب را بردارید و صفحهٔ دیگری را انتخاب
        کنید. جست‌وجو انتخاب‌های فعلی را حذف نمی‌کند. فهرست به صفحات شناسایی‌شده
        محدود است؛ نقشهٔ سایت حداکثر ۲۰۰ نشانی برمی‌گرداند.
      </p>
      {!visiblePages.length && (
        <p role="status">
          صفحه‌ای با این جست‌وجو پیدا نشد؛ عبارت را تغییر دهید یا از مرحلهٔ ۱
          صفحات بیشتری دریافت کنید.
        </p>
      )}
      <fieldset disabled={!pillar} className="max-h-72 space-y-2 overflow-auto">
        <legend className="mb-2 font-medium">
          مقالات کلاستر · {selected.length} از ۲۰ انتخاب شده
        </legend>
        {visiblePages.map((page) => (
          <label
            key={page.url}
            className="flex items-start gap-3 rounded-lg border border-base-300 p-3"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={selected.includes(page.url)}
              disabled={selected.length >= 20 && !selected.includes(page.url)}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, page.url]
                    : selected.filter((url) => url !== page.url),
                )
              }
            />
            <span className="min-w-0">
              <span className="block">{page.title}</span>
              <span
                dir="ltr"
                className="block break-all text-xs text-base-content/60"
              >
                {page.url}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </>
  );
}
