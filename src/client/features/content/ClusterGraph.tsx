import { useState } from "react";
import type { ContentCluster } from "@/shared/contentClusters";

export function ClusterGraph({ cluster }: { cluster: ContentCluster }) {
  const [offset, setOffset] = useState(0);
  const start = Math.min(
    offset,
    Math.max(0, Math.ceil(cluster.pages.length / 5) - 1),
  );
  const pages = cluster.pages.slice(start * 5, start * 5 + 5);
  const height = Math.max(112, pages.length * 56);
  return (
    <div className="my-3 space-y-2">
      <div className="overflow-x-auto" dir="ltr">
        <svg
          viewBox={`0 0 760 ${height}`}
          className="mx-auto block w-full min-w-[540px] max-w-[760px]"
          role="img"
          aria-label={`روابط دوطرفهٔ پیشنهادی ${cluster.pillar.title}`}
        >
          {pages.map((page, index) => (
            <g key={page.url}>
              <title>{page.title}</title>
              <path
                d={`M 260 ${height / 2} C 360 ${height / 2}, 360 ${index * 56 + 28}, 440 ${index * 56 + 28}`}
                fill="none"
                stroke="currentColor"
                className="text-primary/40"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <rect
                x="440"
                y={index * 56 + 6}
                width="300"
                height="44"
                rx="8"
                className="fill-base-200 stroke-base-300"
              />
              <text
                x="590"
                y={index * 56 + 33}
                textAnchor="middle"
                className="fill-base-content text-sm"
              >
                {page.title.slice(0, 38)}
              </text>
            </g>
          ))}
          <rect
            x="10"
            y={height / 2 - 32}
            width="250"
            height="64"
            rx="10"
            className="fill-primary"
          />
          <text
            x="135"
            y={height / 2 + 5}
            textAnchor="middle"
            className="fill-primary-content text-sm"
          >
            <title>{cluster.pillar.title}</title>
            {cluster.pillar.title.slice(0, 30)}
          </text>
        </svg>
      </div>
      <nav
        aria-label="زیرشاخه‌های نقشه"
        className="flex flex-wrap items-center justify-center gap-3 text-sm"
      >
        <button
          type="button"
          className="btn btn-sm btn-outline"
          disabled={start === 0}
          onClick={() => setOffset(start - 1)}
        >
          قبلی
        </button>
        <span role="status">
          نمایش {start * 5 + 1} تا{" "}
          {Math.min(start * 5 + 5, cluster.pages.length)} از{" "}
          {cluster.pages.length} زیرشاخه
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          disabled={(start + 1) * 5 >= cluster.pages.length}
          onClick={() => setOffset(start + 1)}
        >
          بعدی
        </button>
      </nav>
    </div>
  );
}
