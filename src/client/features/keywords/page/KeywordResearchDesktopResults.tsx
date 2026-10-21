import {
  ChevronDown,
  Download,
  FileDown,
  Globe,
  RotateCcw,
  Save,
  Sheet,
  SlidersHorizontal,
} from "lucide-react";
import { sortBy } from "remeda";
import {
  downloadKeywordResearchCsv,
  KEYWORD_RESEARCH_HEADERS,
  keywordResearchExportRow,
} from "@/client/features/keywords/state/keywordControllerActions";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  AreaTrendChart,
  OverviewStats,
  SerpAnalysisCard,
} from "@/client/features/keywords/components";
import type { KeywordResearchRow } from "@/types/keywords";
import type { KeywordResearchControllerState } from "./types";
import {
  FilterIntentSelect,
  FilterRangeInputs,
  FilterTextInput,
} from "./keywordResearchFilters";
import { KeywordResearchDesktopTable } from "./KeywordResearchDesktopTable";
import {
  KeywordResearchPagination,
  useKeywordResearchPagination,
} from "./KeywordResearchPagination";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";
import type { ResearchSource } from "@/client/features/keywords/keywordResearchTypes";

const SOURCE_LABELS: Record<ResearchSource, string> = {
  related: "کلمات مرتبط",
  suggestions: "پیشنهادها",
  ideas: "ایده‌ها",
  google_ads: "داده‌های جست‌وجو",
  google_suggest: "پیشنهاد جست‌وجو",
};

const MONTH_SHORT_LABELS = [
  "ژانویه",
  "فوریه",
  "مارس",
  "آوریل",
  "مه",
  "ژوئن",
  "ژوئیه",
  "اوت",
  "سپتامبر",
  "اکتبر",
  "نوامبر",
  "دسامبر",
] as const;

function formatTrendRangeLabel(trend: KeywordResearchRow["trend"]): string {
  if (trend.length === 0) return "۱۲ ماه اخیرِ دارای داده";

  const sorted = sortBy(trend, (item) => item.year * 100 + item.month);
  const last12 = sorted.slice(-12);
  const start = last12[0];
  const end = last12[last12.length - 1];

  const toLabel = (month: number, year: number) => {
    const monthLabel = MONTH_SHORT_LABELS[month - 1] ?? `ماه ${month}`;
    return `${monthLabel} ${year.toLocaleString("fa-IR")}`;
  };

  const startLabel = toLabel(start.month, start.year);
  const endLabel = toLabel(end.month, end.year);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

type Props = {
  controller: KeywordResearchControllerState;
};

export function KeywordResearchDesktopResults({ controller }: Props) {
  return (
    <div className="flex-1 hidden md:flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden gap-4">
      <DesktopKeywordPanel controller={controller} />
      <DesktopSerpPanel controller={controller} />
    </div>
  );
}

function DesktopKeywordPanel({ controller }: Props) {
  const {
    lastResultSource,
    lastUsedFallback,
    searchedKeyword,
    showApproximateMatchNotice,
  } = controller;

  return (
    <div className="order-2 xl:order-1 flex flex-col min-w-0 gap-2 xl:basis-3/5">
      {showApproximateMatchNotice ? (
        <div
          className="rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-base-content"
          role="status"
        >
          برای <span className="font-medium">«{searchedKeyword}»</span> نتیجهٔ
          دقیق پیدا نشد؛ نزدیک‌ترین کلمات مرتبط نمایش داده می‌شوند.
          {lastUsedFallback ? (
            <span className="text-base-content/75">
              {" "}
              منبع جایگزین: {SOURCE_LABELS[lastResultSource]}.
            </span>
          ) : null}
        </div>
      ) : null}
      {controller.overviewKeyword ? (
        <OverviewStats keyword={controller.overviewKeyword} />
      ) : null}
      <DesktopTableCard controller={controller} />
    </div>
  );
}

function DesktopTableCard({ controller }: Props) {
  const {
    activeFilterCount,
    filteredRows,
    rows,
    selectedRows,
    sheetsExportRows,
    showFilters,
  } = controller;
  const { page, pageSize, pageRows, setPage, setPageSize } =
    useKeywordResearchPagination(filteredRows, controller.projectId);

  const keywordCountLabel =
    selectedRows.size > 0
      ? `${selectedRows.size.toLocaleString("fa-IR")} مورد از ${filteredRows.length.toLocaleString("fa-IR")} انتخاب شده`
      : activeFilterCount > 0
        ? `نمایش ${filteredRows.length.toLocaleString("fa-IR")} مورد از ${rows.length.toLocaleString("fa-IR")} کلمهٔ کلیدی`
        : `نمایش ${filteredRows.length.toLocaleString("fa-IR")} کلمهٔ کلیدی`;

  const canExport = filteredRows.length > 0;
  const selectedExportRows = filteredRows
    .filter((row) => selectedRows.has(row.keyword))
    .map(keywordResearchExportRow);
  const handleExportToSheets = () => {
    void exportTableToSheets({
      headers: KEYWORD_RESEARCH_HEADERS,
      rows: sheetsExportRows,
      feature: "keyword_research",
    });
  };
  const handleExportSelectionToSheets = () => {
    void exportTableToSheets({
      headers: KEYWORD_RESEARCH_HEADERS,
      rows: selectedExportRows,
      feature: "keyword_research",
    });
  };
  const handleExportSelectionCsv = () => {
    downloadKeywordResearchCsv(selectedExportRows);
    captureClientEvent("data:export", {
      source_feature: "keyword_research",
      result_count: selectedExportRows.length,
      scope: "selection",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 border border-base-300 rounded-xl bg-base-100 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-base-300">
        <button
          className={`btn btn-ghost btn-sm gap-1.5 ${showFilters ? "btn-active" : ""}`}
          onClick={() => controller.setShowFilters((current) => !current)}
          title="نمایش یا پنهان‌کردن فیلترهای جدول"
        >
          <SlidersHorizontal className="size-3.5" />
          فیلترها
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <span className="text-sm text-base-content/60">
          {keywordCountLabel}
        </span>
        <div className="flex-1" />
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className={`btn btn-ghost btn-sm gap-1 ${!canExport ? "btn-disabled" : ""}`}
          >
            <Download className="size-3.5" />
            <span className="hidden lg:inline">خروجی</span>
            <ChevronDown className="size-3 opacity-60" />
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-56"
          >
            <li>
              <button onClick={handleExportToSheets} disabled={!canExport}>
                <Sheet className="size-4" />
                خروجی به گوگل شیت
              </button>
            </li>
            <li>
              <button onClick={controller.exportCsv} disabled={!canExport}>
                <FileDown className="size-4" />
                خروجی CSV
              </button>
            </li>
          </ul>
        </div>
      </div>

      <TableBulkActionBar
        selectedCount={selectedRows.size}
        onClear={() => controller.setSelectedRows(new Set())}
        actions={
          <div className="flex items-center px-1.5">
            <TableBulkActionButton
              icon={<Save className="size-3.5" />}
              onClick={controller.handleSaveKeywords}
            >
              ذخیرهٔ کلمات
            </TableBulkActionButton>
            <TableBulkExportMenu
              actions={[
                {
                  label: "خروجی به گوگل شیت",
                  icon: <Sheet className="size-4" />,
                  onClick: handleExportSelectionToSheets,
                },
                {
                  label: "خروجی CSV",
                  icon: <FileDown className="size-4" />,
                  onClick: handleExportSelectionCsv,
                },
              ]}
            />
          </div>
        }
      />

      {showFilters ? <DesktopFilters controller={controller} /> : null}
      <KeywordResearchDesktopTable
        activeFilterCount={controller.activeFilterCount}
        filteredRows={pageRows}
        overviewKeyword={controller.overviewKeyword}
        selectedRows={controller.selectedRows}
        setSelectedRows={controller.setSelectedRows}
        sortDir={controller.sortDir}
        sortField={controller.sortField}
        toggleSort={controller.toggleSort}
        resetFilters={controller.resetFilters}
        handleRowClick={controller.handleRowClick}
      />
      {filteredRows.length > 0 ? (
        <KeywordResearchPagination
          page={page}
          pageSize={pageSize}
          totalCount={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
}

function DesktopFilters({ controller }: Props) {
  const { activeFilterCount, filtersForm } = controller;

  return (
    <div className="shrink-0 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">فیلتر نتایج جدول</p>
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount.toLocaleString("fa-IR")} فیلتر فعال
            </span>
          ) : null}
        </div>
        <button
          className="btn btn-xs btn-ghost gap-1"
          onClick={controller.resetFilters}
          disabled={activeFilterCount === 0}
        >
          <RotateCcw className="size-3" />
          پاک‌کردن همه
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FilterTextInput
          form={filtersForm}
          name="include"
          label="عبارت‌های شامل"
          placeholder="مثلاً سئو، طراحی، تهران"
        />
        <FilterTextInput
          form={filtersForm}
          name="exclude"
          label="عبارت‌های حذف‌شده"
          placeholder="مثلاً رایگان، آموزش"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <FilterRangeInputs
          form={filtersForm}
          title="حجم جست‌وجو"
          minName="minVol"
          maxName="maxVol"
        />
        <FilterRangeInputs
          form={filtersForm}
          title="CPC (دلار)"
          minName="minCpc"
          maxName="maxCpc"
          step="0.01"
        />
        <FilterRangeInputs
          form={filtersForm}
          title="سختی"
          minName="minKd"
          maxName="maxKd"
        />
      </div>

      <FilterIntentSelect form={filtersForm} />
    </div>
  );
}

function DesktopSerpPanel({ controller }: Props) {
  const { overviewKeyword } = controller;
  const trendRangeLabel = overviewKeyword
    ? formatTrendRangeLabel(overviewKeyword.trend)
    : "۱۲ ماه اخیرِ دارای داده";

  return (
    <div className="order-1 xl:order-2 flex flex-col min-w-0 gap-2 xl:basis-2/5 xl:overflow-y-auto">
      {overviewKeyword && overviewKeyword.trend.length > 0 ? (
        <div className="shrink-0 overflow-hidden border border-base-300 rounded-xl bg-base-100 px-4 py-3">
          <h4 className="text-sm font-semibold mb-1">
            روند جست‌وجو{" "}
            <span className="font-normal text-base-content/50">
              {trendRangeLabel}
            </span>
          </h4>
          <AreaTrendChart trend={overviewKeyword.trend} />
        </div>
      ) : null}

      <div className="flex flex-col overflow-hidden border border-base-300 rounded-xl bg-base-100">
        <div className="shrink-0 px-4 py-3 border-b border-base-300">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Globe className="size-3.5" />
            تحلیل نتایج جست‌وجو
            {controller.activeSerpKeyword ? (
              <span className="font-normal text-base-content/50 truncate">
                : {controller.activeSerpKeyword}
              </span>
            ) : null}
          </h3>
        </div>
        <div className="p-4">
          <SerpAnalysisCard
            items={controller.serpResults}
            keyword={controller.activeSerpKeyword}
            loading={controller.serpLoading}
            loadingMore={controller.serpLoadingMore}
            canLoadMore={controller.canLoadMoreSerp}
            error={controller.serpError}
            onRetry={controller.retrySerp}
            deepFetchFailed={controller.deepFetchFailed}
            page={controller.serpPage}
            pageSize={controller.SERP_PAGE_SIZE}
            onPageChange={controller.setSerpPage}
          />
        </div>
      </div>
    </div>
  );
}
