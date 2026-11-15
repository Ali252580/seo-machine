import {
  clusterLinkTargets,
  type ContentCluster,
} from "@/shared/contentClusters";

export function ClusterLinkPlan({ cluster }: { cluster: ContentCluster }) {
  return (
    <details className="mt-3 rounded-lg border border-base-300 p-3">
      <summary className="cursor-pointer font-medium">
        برنامهٔ لینک‌سازی داخلی این گروه
      </summary>
      <p className="my-3 text-sm text-base-content/70">
        هر مقاله به پیلار و حداکثر دو مقاله با عنوان مرتبط لینک می‌دهد. عنوان
        مقصد، پیشنهاد اولیهٔ انکرتکست است؛ لینک را در جملهٔ مرتبط قرار دهید. این
        برنامه هنوز روی سایت اجرا نشده است.
      </p>
      <ul className="max-h-96 space-y-4 overflow-y-auto">
        {[cluster.pillar, ...cluster.pages].map((source) => (
          <li key={source.url} className="border-t border-base-200 pt-3">
            <p className="break-words font-medium">از: {source.title}</p>
            <ul className="mt-2 space-y-1 ps-4 text-sm">
              {clusterLinkTargets(cluster, source.url).map((target) => (
                <li key={target.url} className="break-words">
                  به:{" "}
                  <a
                    className="link"
                    href={target.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {target.title}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}
