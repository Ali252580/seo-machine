import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getDomainKeywordsPage } from "@/serverFunctions/domain";
import { useProjectMarket } from "@/client/features/projects/useProjectMarket";
import { keywordGapRows } from "./keywordGapRows";

export function KeywordGap({
  projectId,
  onChoose,
}: {
  projectId: string;
  onChoose: (keyword: string) => void;
}) {
  const project = useProjectMarket(projectId);
  const [competitor, setCompetitor] = useState("");
  const compare = useMutation({
    mutationFn: async (domain: string) => {
      if (!project?.domain) throw new Error("دامنهٔ پروژه مشخص نیست.");
      const request = {
        projectId,
        page: 1,
        pageSize: 100,
        sortMode: "traffic" as const,
        sortOrder: "desc" as const,
        filters: {},
      };
      const [own, rival] = await Promise.all([
        getDomainKeywordsPage({ data: { ...request, domain: project.domain } }),
        getDomainKeywordsPage({ data: { ...request, domain } }),
      ]);
      return { own, rival };
    },
  });
  const own = new Map(
    compare.data?.own.keywords.map((row) => [
      row.keyword.trim().toLocaleLowerCase(),
      row,
    ]) ?? [],
  );
  const rows = compare.data
    ? keywordGapRows(compare.data.own.keywords, compare.data.rival.keywords)
    : [];
  return (
    <section className="space-y-3 rounded-lg border border-primary/30 p-4">
      <h3 className="font-semibold">فرصت‌های محتوا از مقایسه با رقیب</h3>
      <p className="text-sm">
        ۱۰۰ کلمهٔ پرترافیک هر دامنه در بازار پروژه مقایسه می‌شود. دریافت داده
        ممکن است اعتبار مصرف کند؛ نتایج کش‌شده ممکن است تا ۱۲ ساعت قبل باشند.
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (competitor.trim()) compare.mutate(competitor.trim());
        }}
      >
        <input
          className="input input-bordered flex-1"
          aria-label="دامنهٔ رقیب"
          placeholder="example.com"
          value={competitor}
          onChange={(event) => setCompetitor(event.target.value)}
        />
        <button
          className="btn btn-primary"
          disabled={!competitor.trim() || !project?.domain || compare.isPending}
        >
          {compare.isPending ? "در حال مقایسه…" : "مقایسه با رقیب"}
        </button>
      </form>
      {!project?.domain && (
        <p className="text-sm">برای مقایسه، دامنهٔ پروژه باید ثبت شده باشد.</p>
      )}
      {compare.isError && (
        <p role="alert">مقایسه انجام نشد: {compare.error.message}</p>
      )}
      {compare.data && (
        <>
          <p className="text-sm">
            رقیب: {compare.data.rival.domain} · دادهٔ سایت:{" "}
            {compare.data.own.fetchedAt} · دادهٔ رقیب:{" "}
            {compare.data.rival.fetchedAt}. نبود کلمه در نمونهٔ سایت، نبود رتبه
            یا صفحه را ثابت نمی‌کند؛ پیش از ساخت مقاله نتیجه را بررسی کنید.
          </p>
          {!rows.length && <p>در این نمونه فرصتی پیدا نشد.</p>}
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {rows.map((row) => {
              const match = own.get(row.keyword.trim().toLocaleLowerCase());
              return (
                <li
                  key={row.keyword}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-base-200 p-3"
                >
                  <span>
                    {row.keyword}{" "}
                    <span className="text-xs">
                      · رتبهٔ رقیب: {row.position ?? "نامشخص"} ·{" "}
                      {match
                        ? `رتبهٔ سایت: ${match.position ?? "نامشخص"}`
                        : "در نمونهٔ سایت دیده نشد"}{" "}
                      · حجم: {row.searchVolume ?? "نامشخص"} · سختی:{" "}
                      {row.keywordDifficulty ?? "نامشخص"}
                    </span>
                  </span>
                  <button
                    className="btn btn-sm"
                    onClick={() => onChoose(row.keyword)}
                  >
                    بررسی و نگارش
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
