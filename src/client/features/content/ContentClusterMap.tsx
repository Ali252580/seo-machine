import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getContentClusters,
  discoverClusterPages,
  saveContentClusters,
} from "@/serverFunctions/contentClusters";
import {
  suggestClusterPages,
  clusterSearchTopic,
  type ContentCluster,
} from "@/shared/contentClusters";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

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
  const [search, setSearch] = useState("");
  const [pillarUrl, setPillarUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<ContentCluster[] | null>(null);
  const clusters = draft ?? query.data?.clusters ?? [];
  const discover = useMutation({
    mutationFn: () => discoverClusterPages({ data: { projectId, search } }),
    onSuccess: () => {
      setPillarUrl("");
      setSelected([]);
    },
  });
  const save = useMutation({
    mutationFn: () => saveContentClusters({ data: { projectId, clusters } }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      setDraft(null);
    },
  });
  const pages = discover.data ?? [];
  const pillar = pages.find((page) => page.url === pillarUrl);
  const topic = clusterSearchTopic(search);
  const invalidTopic = topic.length > 100 || /^https?:\/\//i.test(topic);
  const error = query.error || save.error;
  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-7">
      <header>
        <h1 className="text-2xl font-bold">نقشهٔ پیلار و کلاستر</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7">
          صفحهٔ مرجع را به مقاله‌های زیرموضوع وصل کنید. خطوط این نقشه، برنامهٔ
          لینک‌سازی شما هستند؛ وجود لینک در سایت را نشان نمی‌دهند. نقشهٔ
          ذخیره‌شده در نگارش صفحات سایت استفاده می‌شود.
        </p>
      </header>
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
        <h2 className="text-lg font-semibold">شناسایی صفحات موجود</h2>
        {query.data?.wordpressConnected === false && (
          <p role="status" className="text-warning">
            برای دریافت مقالات، ابتدا وردپرس همین سایت را در{" "}
            <Link
              className="link"
              to="/p/$projectId/settings/integrations"
              params={{ projectId }}
            >
              تنظیمات اتصال‌ها
            </Link>{" "}
            وصل کنید.
          </p>
        )}
        <p className="text-sm text-base-content/70">
          از وردپرس متصل، حداکثر ۵۰ برگه و ۵۰ نوشته در هر جست‌وجو دریافت می‌شود.
          خالی‌گذاشتن موضوع، اولین مجموعهٔ صفحات را می‌آورد؛ برای صفحات بیشتر
          جست‌وجو را دقیق‌تر کنید.
        </p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (invalidTopic) return;
            discover.mutate();
          }}
        >
          <input
            aria-label="موضوع یا آدرس صفحه"
            className="input input-bordered min-w-0 flex-1"
            maxLength={4000}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="مثلاً طراحی روف گاردن"
          />
          <button
            className="btn btn-primary"
            disabled={
              discover.isPending ||
              invalidTopic ||
              !query.data?.wordpressConnected
            }
          >
            {discover.isPending ? "در حال شناسایی…" : "دریافت صفحات"}
          </button>
        </form>
        {topic !== search.trim() && (
          <p className="text-sm">
            موضوع استخراج‌شده از آدرس: «{topic || "همهٔ موضوع‌ها"}». جست‌وجو
            براساس متن است و به اعضای آن دسته‌بندی محدود نمی‌شود.
          </p>
        )}
        {invalidTopic && (
          <p role="alert" className="text-error">
            موضوع را کوتاه‌تر از ۱۰۱ نویسه بنویسید یا یک آدرس کامل و معتبر وارد
            کنید.
          </p>
        )}
        {discover.error && (
          <div role="alert" className="space-y-2 text-error">
            <p>
              دریافت صفحات از وردپرس انجام نشد. موضوع جست‌وجو، اتصال وردپرس و
              دسترسی حساب به نوشته‌ها و برگه‌ها را بررسی کنید.
            </p>
            <Link
              className="link"
              to="/p/$projectId/settings/integrations"
              params={{ projectId }}
            >
              بررسی اتصال وردپرس
            </Link>
          </div>
        )}
        {discover.isSuccess && !pages.length && (
          <p>صفحهٔ منتشرشده‌ای برای این جست‌وجو پیدا نشد.</p>
        )}
        {pages.length > 0 && (
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
                if (pillar)
                  setDraft([
                    ...clusters.filter(
                      (cluster) => cluster.pillar.url !== pillar.url,
                    ),
                    {
                      pillar,
                      pages: pages.filter((page) =>
                        selected.includes(page.url),
                      ),
                    },
                  ]);
              }}
            >
              افزودن / جایگزینی خوشه در نقشه
            </button>
            <p className="text-xs">
              حداکثر ۲۰ زیرموضوع برای هر پیلار؛ سپس «ذخیرهٔ نقشه» را بزنید.
            </p>
          </>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          اتصال پیشنهادی صفحات · {clusters.length.toLocaleString("fa-IR")} پیلار
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
          تغییرات نقشه هنوز ذخیره نشده‌اند.
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
                <Link
                  className="link text-sm"
                  to="/p/$projectId/content"
                  params={{ projectId }}
                  search={{ page: page.url, title: page.title }}
                >
                  نگارش و لینک‌سازی این صفحه
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
