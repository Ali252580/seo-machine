import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getContentClusters,
  saveContentClusters,
} from "@/serverFunctions/contentClusters";
import {
  suggestClusterPages,
  mergeDiscoveredPages,
  type DiscoveredClusterPage,
  type ContentCluster,
} from "@/shared/contentClusters";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { ClusterPageDiscovery } from "./ClusterPageDiscovery";
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
  const [pages, setPages] = useState<DiscoveredClusterPage[]>([]);
  const [pillarUrl, setPillarUrl] = useState("");
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<ContentCluster[] | null>(null);
  const editor = useRef<HTMLDetailsElement>(null);
  const editCluster = (cluster: ContentCluster) => {
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
    mutationFn: () => saveContentClusters({ data: { projectId, clusters } }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      setDraft(null);
    },
  });
  const pillar = pages.find((page) => page.url === pillarUrl);
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
        disabled={!query.data?.canManage || save.isPending}
        onChoose={editCluster}
      />
      <details
        ref={editor}
        className="space-y-4 rounded-xl border border-base-300 p-4"
      >
        <summary className="cursor-pointer font-semibold">
          ساخت یا اصلاح دستی گروه
        </summary>
        {pages.length > 0 && (
          <fieldset
            className="space-y-4"
            disabled={save.isPending || !query.data?.canManage}
          >
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
              این پیشنهاد فقط از اشتراک واژه‌های عنوان است؛ تحلیل SERP نیست.
              ارتباط موضوعی را بازبینی کنید.
            </p>
            <fieldset
              disabled={!pillar}
              className="max-h-72 space-y-2 overflow-auto"
            >
              <legend className="mb-2 font-medium">مقالات کلاستر</legend>
              {pages
                .filter((page) => page.url !== pillarUrl)
                .map((page) => (
                  <label
                    key={page.url}
                    className="flex items-start gap-3 rounded-lg border border-base-300 p-3"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selected.includes(page.url)}
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
            <button
              className="btn btn-outline"
              disabled={
                !query.data?.canManage ||
                !pillar ||
                !selected.length ||
                selected.length > 20 ||
                save.isPending
              }
              onClick={() => {
                if (pillar) {
                  setDraft([
                    ...clusters.filter(
                      (cluster) =>
                        cluster.pillar.url !== pillar.url &&
                        cluster.pillar.url !== editingUrl,
                    ),
                    {
                      pillar,
                      pages: pages.filter((page) =>
                        selected.includes(page.url),
                      ),
                    },
                  ]);
                  setEditingUrl(null);
                  setPillarUrl("");
                  setSelected([]);
                  if (editor.current) editor.current.open = false;
                }
              }}
            >
              افزودن / جایگزینی خوشه در نقشه
            </button>
            <p className="text-xs">
              حداکثر ۲۰ زیرموضوع برای هر پیلار؛ سپس «ذخیرهٔ نقشه» را بزنید.
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
            draft === null ||
            save.isPending ||
            clusters.length > 20
          }
          onClick={() => save.mutate()}
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
              disabled={!query.data?.canManage || save.isPending}
              onClick={() => editCluster(cluster)}
            >
              اصلاح گروه
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={!query.data?.canManage || save.isPending}
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
