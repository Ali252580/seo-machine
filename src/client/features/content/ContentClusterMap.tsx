import { useRef, useState } from "react";

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

import { ClusterWorkspace } from "./ClusterWorkspace";

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
  const discovery = useRef<HTMLDetailsElement>(null);
  const closeEditor = () => {
    setEditingUrl(null);
    setPillarUrl("");
    setSelected([]);
    setValidationError("");
    if (editor.current) editor.current.open = false;
  };
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
      closeEditor();
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
          موضوع‌های اصلی، مقاله‌های پشتیبان و مسیر لینک‌سازی داخلی سایت را در یک
          جا مدیریت کنید.
        </p>
      </header>
      <nav
        aria-label="دسترسی سریع نقشه"
        className="flex flex-wrap gap-2 border-b border-base-300 pb-4"
      >
        <a href="#cluster-workspace" className="btn btn-sm btn-primary">
          مرور نقشه
        </a>
        <a
          href="#cluster-discovery"
          className="btn btn-sm btn-ghost"
          onClick={() => {
            if (discovery.current) discovery.current.open = true;
          }}
        >
          افزودن صفحات یا فایل
        </a>
        <a
          href="#cluster-editor"
          className="btn btn-sm btn-outline"
          onClick={() => {
            if (editor.current) editor.current.open = true;
          }}
        >
          ساخت یا اصلاح گروه
        </a>
      </nav>
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
      <div
        id="cluster-workspace"
        className="scroll-mt-4 flex flex-wrap items-center justify-between gap-3"
      >
        <h2 className="text-lg font-semibold">نقشهٔ موضوعی سایت</h2>
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
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
        >
          <p>
            تغییرات هنوز ذخیره نشده‌اند. برای استفاده از این گروه‌ها در نگارش،
            «ذخیرهٔ نقشه» را بزنید.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={save.isPending}
            onClick={() => setDraft(null)}
          >
            برگرداندن نقشهٔ ذخیره‌شده
          </button>
        </div>
      )}
      {!clusters.length && (
        <p className="rounded-xl border border-dashed border-base-300 p-8">
          ابتدا صفحات را دریافت کنید و یک پیلار با زیرموضوع‌های مرتبط بسازید.
        </p>
      )}
      {clusters.length > 0 && (
        <ClusterWorkspace
          clusters={clusters}
          projectId={projectId}
          disabled={cannotEdit}
          saved={draft === null}
          onEdit={editCluster}
          onRemove={(url) =>
            setDraft(clusters.filter((cluster) => cluster.pillar.url !== url))
          }
        />
      )}
      <details
        ref={discovery}
        key={query.data ? "loaded" : "loading"}
        open={pages.length === 0}
        id="cluster-discovery"
        className="scroll-mt-4 space-y-4 rounded-xl border border-base-300 p-4"
      >
        <summary className="cursor-pointer text-base font-semibold">
          افزودن صفحات · دریافت از سایت یا بارگذاری فایل
        </summary>
        <ClusterPageDiscovery
          projectId={projectId}
          onPages={(incoming) =>
            setPages((current) =>
              mergeDiscoveredPages([...current, ...incoming]),
            )
          }
        />
      </details>
      <details className="rounded-xl border border-base-300 p-4">
        <summary className="cursor-pointer font-semibold">
          پیشنهاد گروه‌های تازه از صفحات سایت
        </summary>
        <div className="mt-4">
          <ClusterSuggestions
            pages={pages}
            clusters={clusters}
            disabled={cannotEdit}
            onChoose={editCluster}
          />
        </div>
      </details>
      <details
        id="cluster-editor"
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
            <button
              type="button"
              className="btn btn-ghost ms-2"
              disabled={save.isPending}
              onClick={closeEditor}
            >
              انصراف از ویرایش
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
    </main>
  );
}
