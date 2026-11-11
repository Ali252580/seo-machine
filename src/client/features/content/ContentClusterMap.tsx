import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getContentClusters,
  discoverClusterPages,
  saveContentClusters,
} from "@/serverFunctions/contentClusters";
import {
  mergeDiscoveredPages,
  type DiscoveredClusterPage,
  type ContentCluster,
} from "@/shared/contentClusters";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { ClusterPageDiscovery } from "./ClusterPageDiscovery";
import { ClusterPagePicker } from "./ClusterPagePicker";
import { ClusterSuggestions } from "./ClusterSuggestions";

function ClusterGraph({ cluster }: { cluster: ContentCluster }) {
  return (
    <div className="overflow-x-auto" dir="ltr">
      <svg
        viewBox={`0 0 760 ${Math.max(160, cluster.pages.length * 80)}`}
        className="min-w-[600px] w-full"
        role="img"
        aria-label={`روابط دوطرفهٔ پیشنهادی ${cluster.pillar.title}`}
      >
        {cluster.pages.map((page, index) => (
          <g key={page.url}>
            <path
              d={`M 260 ${Math.max(160, cluster.pages.length * 80) / 2} C 360 ${Math.max(160, cluster.pages.length * 80) / 2}, 360 ${index * 80 + 40}, 440 ${index * 80 + 40}`}
              fill="none"
              stroke="currentColor"
              className="text-primary/40"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <rect
              x="440"
              y={index * 80 + 12}
              width="300"
              height="56"
              rx="8"
              className="fill-base-200 stroke-base-300"
            />
            <text
              x="590"
              y={index * 80 + 46}
              textAnchor="middle"
              className="fill-base-content text-sm"
            >
              {page.title.slice(0, 38)}
            </text>
          </g>
        ))}
        <rect
          x="10"
          y={Math.max(160, cluster.pages.length * 80) / 2 - 32}
          width="250"
          height="64"
          rx="10"
          className="fill-primary"
        />
        <text
          x="135"
          y={Math.max(160, cluster.pages.length * 80) / 2 + 5}
          textAnchor="middle"
          className="fill-primary-content text-sm"
        >
          {cluster.pillar.title.slice(0, 30)}
        </text>
      </svg>
    </div>
  );
}
export function ContentClusterMap({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const key = ["contentClusters", projectId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => getContentClusters({ data: { projectId } }),
  });
  const [incomingPages, setPages] = useState<DiscoveredClusterPage[]>([]);
  const [pillarUrl, setPillarUrl] = useState("");
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<ContentCluster[] | null>(null);
  const [validationError, setValidationError] = useState("");
  const alternatives = useQuery({
    queryKey: ["clusterReplacementPages", projectId],
    queryFn: () =>
      discoverClusterPages({
        data: { projectId, source: "sitemap", search: "" },
      }),
    enabled: Boolean(pillarUrl),
    staleTime: 5 * 60 * 1000,
  });
  const { data: alternativePages = [] } = alternatives;
  const pages = mergeDiscoveredPages([
    ...(query.data?.pages ?? []),
    ...alternativePages,
    ...(query.data?.clusters ?? []).flatMap((cluster) => [
      cluster.pillar,
      ...cluster.pages,
    ]),
    ...incomingPages,
  ]);
  const editor = useRef<HTMLDetailsElement>(null);
  const editCluster = (cluster: ContentCluster) => {
    setValidationError("");
    setEditingUrl(cluster.pillar.url);
    setPages((current) => [
      ...new Map(
        [...current, cluster.pillar, ...cluster.pages].map((page) => [
          page.url,
          page,
        ]),
      ).values(),
    ]);
    setPillarUrl(cluster.pillar.url);
    setSelected(cluster.pages.map((page) => page.url));
    if (editor.current) {
      editor.current.open = true;
      editor.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const clusters = draft ?? query.data?.clusters ?? [];
  const save = useMutation({
    mutationFn: (next: ContentCluster[]) =>
      saveContentClusters({ data: { projectId, clusters: next } }),
    onSuccess: (result) => {
      client.setQueryData(key, { ...query.data, clusters: result.clusters });
      setDraft(null);
      setEditingUrl(null);
      setPillarUrl("");
      setSelected([]);
      if (editor.current) editor.current.open = false;
    },
  });
  const pillar = pages.find((page) => page.url === pillarUrl);
  const otherClusters = clusters.filter(
    (cluster) =>
      cluster.pillar.url !== pillarUrl && cluster.pillar.url !== editingUrl,
  );
  const saveGroup = () => {
    const chosen = pages.filter(
      (page) => page.url !== pillarUrl && selected.includes(page.url),
    );
    const message = !pillar
      ? "ابتدا صفحهٔ پیلار را انتخاب کنید."
      : !chosen.length
        ? "حداقل یک مقالهٔ کلاستر را انتخاب کنید."
        : chosen.length > 20
          ? "برای هر پیلار حداکثر ۲۰ مقاله انتخاب کنید."
          : otherClusters.length >= 20
            ? "نقشه حداکثر ۲۰ گروه دارد؛ یک گروه موجود را اصلاح یا حذف کنید."
            : "";
    setValidationError(message);
    if (message || !pillar) return;
    const next = [...otherClusters, { pillar, pages: chosen }];
    setDraft(next);
    save.mutate(next);
  };
  const cannotEdit = !query.data?.canManage || save.isPending;
  const error = query.error || save.error;
  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-7">
      <header>
        <h1 className="text-2xl font-bold">نقشهٔ پیلار و کلاستر</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7">
          مشخص کنید هر مقاله زیرمجموعهٔ کدام موضوع است و هنگام نگارش به چه
          صفحاتی لینک بدهد. ابتدا صفحات را دریافت کنید، گروه‌های پیشنهادی را
          بررسی کنید و نقشه را ذخیره کنید.
        </p>
      </header>
      <ol className="grid gap-3 sm:grid-cols-3" aria-label="مراحل ساخت نقشه">
        <li className="rounded-lg bg-base-200 p-3">
          ۱. دریافت صفحات · {pages.length} صفحه
        </li>
        <li className="rounded-lg bg-base-200 p-3">
          ۲. بررسی گروه‌ها · {clusters.length} گروه
        </li>
        <li className="rounded-lg bg-base-200 p-3">
          ۳.{" "}
          {draft === null
            ? "ذخیره و استفاده در نگارش"
            : "تغییرات منتظر ذخیره‌اند"}
        </li>
      </ol>
      {query.isPending && <p role="status">در حال دریافت نقشه…</p>}
      {error && (
        <div role="alert" className="alert alert-error">
          {getStandardErrorMessage(error)}
          {query.error && (
            <button className="btn btn-sm" onClick={() => void query.refetch()}>
              دریافت دوبارهٔ نقشه
            </button>
          )}
        </div>
      )}
      <section className="space-y-4 rounded-xl border border-base-300 p-4">
        <h2 className="text-lg font-semibold">۱. صفحات سایت را دریافت کنید</h2>
        <ClusterPageDiscovery
          projectId={projectId}
          onPages={(incoming) =>
            setPages((current) =>
              mergeDiscoveredPages([...current, ...incoming]),
            )
          }
        />
      </section>
      <ClusterSuggestions
        pages={pages}
        clusters={clusters}
        disabled={cannotEdit}
        onChoose={editCluster}
      />
      <details
        ref={editor}
        className="space-y-4 rounded-xl border border-base-300 p-4"
      >
        <summary className="cursor-pointer font-semibold">
          ساخت یا اصلاح دستی گروه
        </summary>
        {query.data && !query.data.canManage && (
          <p role="status">
            برای ذخیرهٔ نقشه به دسترسی مدیر یا مالک پروژه نیاز دارید.
          </p>
        )}
        {(validationError || save.error) && (
          <p role="alert" className="text-error">
            {validationError || getStandardErrorMessage(save.error)}
          </p>
        )}
        {alternatives.isFetching && (
          <p role="status">در حال دریافت صفحات دیگر سایت برای جایگزینی…</p>
        )}
        {alternatives.error && (
          <p role="alert">
            دریافت صفحات دیگر سایت انجام نشد؛ انتخاب‌های فعلی حفظ شده‌اند.
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void alternatives.refetch()}
            >
              تلاش دوباره
            </button>
          </p>
        )}
        {pages.length > 0 && (
          <fieldset className="space-y-4" disabled={cannotEdit}>
            <ClusterPagePicker
              pages={pages}
              pillarUrl={pillarUrl}
              selected={selected}
              setPillarUrl={(url) => {
                setPillarUrl(url);
                setValidationError("");
              }}
              setSelected={(urls) => {
                setSelected(urls);
                setValidationError("");
              }}
            />
            <button
              className="btn btn-outline"
              type="button"
              disabled={cannotEdit}
              onClick={saveGroup}
            >
              {save.isPending ? "در حال ذخیره…" : "ذخیرهٔ گروه در نقشه"}
            </button>
            <p className="text-xs">
              حداکثر ۲۰ گروه و ۲۰ زیرموضوع برای هر پیلار؛ گروه مستقیماً ذخیره
              می‌شود.
            </p>
          </fieldset>
        )}
        {!pages.length && (
          <p>
            ابتدا صفحات را دریافت کنید یا «اصلاح گروه» را در نقشهٔ ذخیره‌شده
            بزنید.
          </p>
        )}
      </details>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          ۳. نقشه را ذخیره کنید · {clusters.length.toLocaleString("fa-IR")} گروه
        </h2>
        <button
          className="btn btn-primary"
          disabled={
            !query.data?.canManage ||
            (draft === null && !pillarUrl && !selected.length) ||
            save.isPending ||
            clusters.length > 20
          }
          onClick={() =>
            pillarUrl || selected.length ? saveGroup() : save.mutate(clusters)
          }
        >
          {save.isPending ? "در حال ذخیره…" : "ذخیرهٔ نقشه"}
        </button>
      </div>
      {save.isSuccess && draft === null && (
        <p role="status" className="text-success">
          نقشه ذخیره شد و در نگارش صفحات سایت استفاده می‌شود.
        </p>
      )}
      {draft !== null && (
        <p role="status" className="text-warning">
          تغییرات هنوز ذخیره نشده‌اند. برای استفاده از این گروه‌ها در نگارش،
          «ذخیرهٔ نقشه» را بزنید.
        </p>
      )}
      {!clusters.length && (
        <p className="rounded-xl border border-dashed border-base-300 p-8">
          ابتدا صفحات را دریافت کنید و یک پیلار با زیرموضوع‌های مرتبط بسازید.
        </p>
      )}
      {clusters.map((cluster) => (
        <section
          key={cluster.pillar.url}
          className="overflow-hidden rounded-xl border border-base-300 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">پیلار: {cluster.pillar.title}</h3>
            <button
              className="btn btn-outline btn-sm"
              disabled={cannotEdit}
              onClick={() => editCluster(cluster)}
            >
              اصلاح گروه
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={cannotEdit}
              onClick={() =>
                setDraft(
                  clusters.filter(
                    (item) => item.pillar.url !== cluster.pillar.url,
                  ),
                )
              }
            >
              حذف از نقشه
            </button>
          </div>
          <ClusterGraph cluster={cluster} />
          <p className="text-xs text-base-content/60">
            خط‌چین: لینک پیشنهادی پیلار ↔ کلاستر؛ نه لینک تأییدشدهٔ سایت.
          </p>
          <ul className="mt-4 space-y-2">
            {[cluster.pillar, ...cluster.pages].map((page) => (
              <li
                key={page.url}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-base-200 pt-2"
              >
                <span>{page.title}</span>
                {draft === null ? (
                  <Link
                    className="link text-sm"
                    to="/p/$projectId/content"
                    params={{ projectId }}
                    search={{ page: page.url, title: page.title }}
                  >
                    نگارش این صفحه با لینک‌های گروه
                  </Link>
                ) : (
                  <span className="text-xs text-warning">
                    برای نگارش، ابتدا نقشه را ذخیره کنید
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
