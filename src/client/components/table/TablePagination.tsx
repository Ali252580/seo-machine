import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  pageSizes: readonly number[];
  totalCount: number | null;
  hasNextPage: boolean;
  isLoading: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
};

function formatRange(
  page: number,
  pageSize: number,
  totalCount: number | null,
) {
  const start = (page - 1) * pageSize + 1;
  if (totalCount == null) {
    return `صفحهٔ ${page.toLocaleString("fa-IR")}`;
  }
  if (totalCount === 0) return "بدون نتیجه";
  const end = Math.min(totalCount, start + pageSize - 1);
  return `${start.toLocaleString("fa-IR")} تا ${end.toLocaleString("fa-IR")} از ${totalCount.toLocaleString("fa-IR")} نتیجه`;
}

export function TablePagination({
  page,
  pageSize,
  pageSizes,
  totalCount,
  hasNextPage,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const totalPages =
    totalCount != null ? Math.max(1, Math.ceil(totalCount / pageSize)) : null;
  const canGoPrev = page > 1;
  const canGoNext = totalPages != null ? page < totalPages : hasNextPage;

  return (
    <div className="flex flex-col gap-3 border-t border-base-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-base-content/70 tabular-nums">
        <span role="status" aria-live="polite">
          {formatRange(page, pageSize, totalCount)}
        </span>
        {isLoading ? (
          <span
            role="status"
            aria-label="در حال دریافت نتایج"
            className="loading loading-spinner loading-xs"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm text-base-content/70">
          <span className="whitespace-nowrap">ردیف در صفحه</span>
          <select
            className="select select-bordered select-sm min-h-11 w-20"
            value={pageSize}
            disabled={isLoading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size.toLocaleString("fa-IR")}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm tabular-nums text-base-content/70">
            صفحهٔ {page.toLocaleString("fa-IR")}
            {totalPages != null
              ? ` از ${totalPages.toLocaleString("fa-IR")}`
              : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="صفحهٔ قبل"
              className="btn btn-ghost btn-square min-h-11 min-w-11"
              disabled={!canGoPrev || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-label="صفحهٔ بعد"
              className="btn btn-ghost btn-square min-h-11 min-w-11"
              disabled={!canGoNext || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
