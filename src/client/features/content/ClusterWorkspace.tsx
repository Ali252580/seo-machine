import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Network, List, Pencil, Trash2 } from "lucide-react";
import type { ContentCluster } from "@/shared/contentClusters";
import { ClusterGraph } from "./ClusterGraph";
import { ClusterLinkPlan } from "./ClusterLinkPlan";

export function ClusterWorkspace({
  clusters,
  projectId,
  disabled,
  saved,
  onEdit,
  onRemove,
}: {
  clusters: ContentCluster[];
  projectId: string;
  disabled: boolean;
  saved: boolean;
  onEdit: (cluster: ContentCluster) => void;
  onRemove: (url: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [view, setView] = useState<"pages" | "map">("pages");
  const filtered = clusters.filter((cluster) =>
    [cluster.pillar, ...cluster.pages].some((page) =>
      `${page.title} ${page.url}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    ),
  );
  const active =
    filtered.find((cluster) => cluster.pillar.url === selected) ?? filtered[0];
  return (
    <section
      aria-label="مرور گروه‌های موضوعی"
      className="overflow-hidden rounded-xl border border-base-300 bg-base-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 p-4">
        <div>
          <h3 className="font-bold">گروه‌های موضوعی</h3>
          <p className="mt-1 text-xs text-base-content/65">
            یک گروه را انتخاب کنید؛ صفحات و ارتباط‌های همان گروه را ببینید.
          </p>
        </div>
        <span
          className={`badge badge-outline ${saved ? "badge-success" : "badge-warning"}`}
        >
          {saved ? "نقشهٔ ذخیره‌شده" : "تغییرات ذخیره‌نشده"}
        </span>
      </div>
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-base-300 bg-base-200/40 lg:border-b-0 lg:border-e">
          <label className="input input-bordered m-3 flex items-center gap-2">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              className="min-w-0"
              aria-label="جست‌وجوی گروه یا مقاله"
              placeholder="گروه، مقاله یا نشانی…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <p role="status" className="px-4 pb-2 text-xs text-base-content/60">
            {filtered.length.toLocaleString("fa-IR")} از{" "}
            {clusters.length.toLocaleString("fa-IR")} گروه
          </p>
          <nav
            aria-label="انتخاب گروه"
            className="max-h-64 overflow-y-auto p-2 lg:max-h-[36rem]"
          >
            {filtered.map((cluster) => (
              <button
                key={cluster.pillar.url}
                type="button"
                aria-pressed={active?.pillar.url === cluster.pillar.url}
                onClick={() => setSelected(cluster.pillar.url)}
                className={`mb-1 w-full rounded-lg border p-3 text-start focus-visible:outline-2 focus-visible:outline-primary ${active?.pillar.url === cluster.pillar.url ? "border-primary/40 bg-primary/10 text-primary" : "border-transparent hover:bg-base-200"}`}
              >
                <span className="block text-sm font-semibold leading-6">
                  {cluster.pillar.title}
                </span>
                <span className="mt-1 block text-xs opacity-70">
                  {cluster.pages.length.toLocaleString("fa-IR")} مقالهٔ کلاستر
                </span>
              </button>
            ))}
          </nav>
        </aside>
        {active ? (
          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-primary">
                  صفحهٔ پیلار
                </span>
                <h3 className="mt-1 text-lg font-bold leading-8">
                  {active.pillar.title}
                </h3>
                <a
                  href={active.pillar.url}
                  target="_blank"
                  rel="noreferrer"
                  dir="ltr"
                  className="mt-1 block truncate text-start text-xs text-base-content/60 hover:underline"
                >
                  {active.pillar.url}
                </a>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onEdit(active)}
                  className="btn btn-sm btn-outline"
                >
                  <Pencil size={14} aria-hidden="true" />
                  اصلاح گروه
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(active.pillar.url)}
                  className="btn btn-sm btn-ghost text-error"
                  aria-label={`حذف گروه ${active.pillar.title}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div
              role="group"
              aria-label="نوع نمایش گروه"
              className="my-5 flex gap-2 border-b border-base-300 pb-3"
            >
              <button
                type="button"
                aria-pressed={view === "pages"}
                onClick={() => setView("pages")}
                className={`btn btn-sm ${view === "pages" ? "btn-primary" : "btn-ghost"}`}
              >
                <List size={16} aria-hidden="true" />
                صفحات ({active.pages.length + 1})
              </button>
              <button
                type="button"
                aria-pressed={view === "map"}
                onClick={() => setView("map")}
                className={`btn btn-sm ${view === "map" ? "btn-primary" : "btn-ghost"}`}
              >
                <Network size={16} aria-hidden="true" />
                نقشهٔ ارتباط‌ها
              </button>
            </div>
            {view === "map" ? (
              <>
                <ClusterGraph key={active.pillar.url} cluster={active} />
                <p className="text-xs leading-6 text-base-content/65">
                  خط‌چین‌ها پیشنهاد لینک هستند؛ وجود لینک در سایت تأیید نشده
                  است.
                </p>
              </>
            ) : (
              <ul className="max-h-[32rem] divide-y divide-base-200 overflow-y-auto">
                {[active.pillar, ...active.pages].map((page, index) => (
                  <li
                    key={page.url}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <span
                      className={`badge badge-sm shrink-0 ${index === 0 ? "badge-primary" : "badge-ghost"}`}
                    >
                      {index === 0 ? "پیلار" : "کلاستر"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-6">
                        {page.title}
                      </p>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                        className="block truncate text-start text-xs text-base-content/50 hover:underline"
                      >
                        {page.url}
                      </a>
                    </div>
                    {saved && (
                      <Link
                        className="btn btn-sm btn-ghost text-primary"
                        to="/p/$projectId/content"
                        params={{ projectId }}
                        search={{ page: page.url, title: page.title }}
                      >
                        نگارش و بهبود
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!saved && (
              <p role="status" className="mt-3 text-sm text-warning">
                برای نگارش با این ارتباط‌ها، ابتدا نقشه را ذخیره کنید.
              </p>
            )}
            <div className="mt-5 border-t border-base-300 pt-3">
              <ClusterLinkPlan cluster={active} />
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-sm leading-7">
            <p>گروهی با این عنوان یا نشانی پیدا نشد.</p>
            <button
              type="button"
              className="btn btn-sm btn-ghost mt-3"
              onClick={() => setSearch("")}
            >
              پاک‌کردن جست‌وجو
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
