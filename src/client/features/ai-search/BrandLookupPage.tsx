import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Quote,
  TrendingUp,
} from "lucide-react";
import { lookupBrand } from "@/serverFunctions/ai-search";
import {
  HostedPlanGate,
  type HostedPlanGateState,
} from "@/client/features/billing/HostedPlanGate";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { BrandLookupResults } from "@/client/features/ai-search/components/BrandLookupResults";
import { BrandLookupSearchCard } from "@/client/features/ai-search/components/BrandLookupSearchCard";
import { BrandLookupHistorySection } from "@/client/features/ai-search/components/BrandLookupHistorySection";
import { AiSearchLoadingState } from "@/client/features/ai-search/components/AiSearchLoadingState";
import { AiSearchPaidPlanGate } from "@/client/features/ai-search/components/AiSearchPaidPlanGate";
import { useBrandLookupSearchHistory } from "@/client/hooks/useBrandLookupSearchHistory";
import {
  BRAND_LOOKUP_MAX_INPUT_LENGTH,
  parseCompetitorList,
} from "@/types/schemas/ai-search";
import { detectTarget } from "@/shared/targetDetection";
import { useProjectMarket } from "@/client/features/projects/useProjectMarket";
import {
  DEFAULT_LOCATION_CODE,
  getLanguageCode,
} from "@/shared/keyword-locations";
import {
  parseResearchTarget,
  toScopeSearchParam,
  type ResearchScope,
} from "@/shared/researchScope";

type Props = {
  projectId: string;
  initialQuery: string;
  initialCompetitors: string[];
  initialScope: ResearchScope | undefined;
  onSearchChange: (
    nextQuery: string,
    nextCompetitors: string[],
    nextScope: ResearchScope | undefined,
  ) => void;
};

const KEYWORD_SCOPE_REASON = "Scopes apply to domain lookups";

const BRAND_LOOKUP_BULLETS = [
  {
    icon: TrendingUp,
    title: "پیگیری حضور در هوش مصنوعی",
    body: "تعداد تخمینی پاسخ‌هایی که به برند شما اشاره می‌کنند و روند ماهانهٔ آن را ببینید.",
  },
  {
    icon: Quote,
    title: "مشاهدهٔ پرسش‌ها",
    body: "نمونهٔ پرسش‌هایی را ببینید که مدل‌ها در پاسخ به آن‌ها از برند یا دامنهٔ شما نام می‌برند.",
  },
  {
    icon: BarChart3,
    title: "شناخت رقبا",
    body: "صفحاتی را که در کنار سایت شما به‌عنوان منبع معرفی می‌شوند بشناسید.",
  },
];

export function BrandLookupPage(props: Props) {
  return (
    <HostedPlanGate>
      {(planGate) => <BrandLookupPageInner {...props} planGate={planGate} />}
    </HostedPlanGate>
  );
}

function BrandLookupPageInner({
  projectId,
  initialQuery,
  initialCompetitors,
  initialScope,
  onSearchChange,
  planGate,
}: Props & { planGate: HostedPlanGateState }) {
  const projectMarket = useProjectMarket(projectId);
  const projectDomain = projectMarket?.domain;
  const locationCode = projectMarket?.locationCode ?? DEFAULT_LOCATION_CODE;
  const languageCode =
    projectMarket?.languageCode ?? getLanguageCode(locationCode);
  const [query, setQuery] = useState(initialQuery || projectDomain || "");
  // The user's explicit scope pick, or undefined to follow the input's default.
  const [scopeChoice, setScopeChoice] = useState<ResearchScope | undefined>(
    initialScope,
  );
  // Raw comma-separated competitor text; parsed into a deduped array on submit.
  const [competitorsInput, setCompetitorsInput] = useState(
    initialCompetitors.join(", "),
  );
  // Field-tagged so the error styling lands on the input that caused it.
  const [validationError, setValidationError] = useState<{
    field: "query" | "competitors";
    message: string;
  } | null>(null);

  const trimmedInitialQuery = initialQuery.trim();
  const hasActiveQuery = trimmedInitialQuery.length > 0;
  // The URL `c` param is the source of truth for the active lookup; the local
  // `competitorsInput` text only drives the input until the next submit. A
  // stable string key, since `initialCompetitors` is a fresh array each render.
  const competitorKey = initialCompetitors.join(",");

  // Scope only applies to domain/URL inputs. The pick always stays selectable
  // — an invalid one (Subfolder without a path) errors on submit instead of
  // the select greying out or changing under the user.
  const scopeTarget = useMemo(() => {
    if (detectTarget(query).type !== "domain") return null;
    const parsed = parseResearchTarget(query);
    return parsed.ok ? parsed.target : null;
  }, [query]);

  const selectedScope = scopeChoice ?? scopeTarget?.scope ?? "domain";
  // Only grey the control once the input is clearly a brand keyword — an
  // empty box shouldn't look disabled before the user has typed anything.
  const scopeDisabledReason =
    query.trim() !== "" && !scopeTarget ? KEYWORD_SCOPE_REASON : undefined;

  const lookupQuery = useQuery({
    queryKey: [
      "brand-lookup",
      projectId,
      locationCode,
      languageCode,
      trimmedInitialQuery,
      competitorKey,
      initialScope ?? "",
    ],
    queryFn: () =>
      lookupBrand({
        data: {
          projectId,
          query: trimmedInitialQuery,
          competitors: initialCompetitors,
          scope: initialScope,
          locationCode,
          languageCode,
        },
      }),
    // Client-side gate is a UX optimization only; the paywall is enforced
    // server-side (lookupBrand → assertPaidPlan) before any DataForSEO spend,
    // so a stale free-plan window here just yields a rejected request, not cost.
    enabled: hasActiveQuery && !!projectMarket && !planGate.isFreePlan,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const {
    history,
    isLoaded: historyLoaded,
    addSearch,
    removeHistoryItem,
  } = useBrandLookupSearchHistory(projectId);

  // Dedup ref prevents repeat adds — `addSearch` identity is not stable
  // across renders, so we'd otherwise re-write the same item every render.
  // Key on query + competitors so changing competitors records a fresh entry.
  const lastAddedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasActiveQuery || !lookupQuery.isSuccess) return;
    const addedKey = `${trimmedInitialQuery}::${competitorKey}::${initialScope ?? ""}`;
    if (lastAddedKeyRef.current === addedKey) return;
    lastAddedKeyRef.current = addedKey;
    addSearch({
      query: trimmedInitialQuery,
      competitors: competitorKey ? competitorKey.split(",") : [],
      scope: initialScope,
    });
  }, [
    hasActiveQuery,
    lookupQuery.isSuccess,
    trimmedInitialQuery,
    competitorKey,
    initialScope,
    addSearch,
  ]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setValidationError({
        field: "query",
        message: "نام برند یا دامنه را وارد کنید",
      });
      return;
    }
    if (trimmed.length > BRAND_LOOKUP_MAX_INPUT_LENGTH) {
      setValidationError({
        field: "query",
        message: `Keep it under ${BRAND_LOOKUP_MAX_INPUT_LENGTH} characters`,
      });
      return;
    }
    const competitors = parseCompetitorList(competitorsInput);
    // Mirror the server's input schema (per-item max) and its competitor
    // resolution (a competitor that resolves to the target is dropped) so the
    // user gets an inline message instead of a generic server error or a
    // silently missing Share of Voice section.
    const tooLong = competitors.find(
      (competitor) => competitor.length > BRAND_LOOKUP_MAX_INPUT_LENGTH,
    );
    if (tooLong) {
      setValidationError({
        field: "competitors",
        message: `Keep each competitor under ${BRAND_LOOKUP_MAX_INPUT_LENGTH} characters`,
      });
      return;
    }
    const targetValue = detectTarget(trimmed).value.toLowerCase();
    const matchesTarget = competitors.find(
      (competitor) =>
        detectTarget(competitor).value.toLowerCase() === targetValue,
    );
    if (matchesTarget) {
      setValidationError({
        field: "competitors",
        message: `"${matchesTarget}" matches the brand you're looking up — remove it from competitors`,
      });
      return;
    }
    if (
      scopeTarget &&
      selectedScope === "subfolder" &&
      scopeTarget.path === ""
    ) {
      setValidationError({
        field: "query",
        message: "Add a path to use Subfolder (e.g. example.com/blog)",
      });
      return;
    }
    setValidationError(null);
    // Keyword lookups never carry a scope; domain lookups omit it when it
    // matches the query's implied default.
    const explicitScope = scopeTarget
      ? toScopeSearchParam(trimmed, selectedScope)
      : undefined;
    onSearchChange(trimmed, competitors, explicitScope);
  };

  // The form inputs are reset whenever the URL `q`/`c` changes — including the
  // browser-back path and Cmd+click navigation. This keeps local form state in
  // sync with the URL source-of-truth. Depend on the stable `competitorKey`
  // string (not the fresh-each-render `initialCompetitors` array) so typing in
  // the competitor field isn't clobbered on every render.
  useEffect(() => {
    setQuery(initialQuery || projectDomain || "");
    setCompetitorsInput(competitorKey.split(",").join(", "));
    setScopeChoice(initialScope);
    setValidationError(null);
  }, [initialQuery, competitorKey, initialScope, projectDomain]);

  const isLoading = hasActiveQuery && lookupQuery.isPending;
  const errorMessage =
    hasActiveQuery && lookupQuery.isError
      ? getStandardErrorMessage(lookupQuery.error)
      : null;
  const resultData = hasActiveQuery ? lookupQuery.data : undefined;

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">بررسی برند</h1>
          <p className="text-sm text-base-content/70">
            ببینید موتورهای جست‌وجوی هوش مصنوعی چگونه از برند یا دامنهٔ شما نام
            می‌برند.
          </p>
        </div>

        {planGate.isFreePlan ? (
          <AiSearchPaidPlanGate
            feature="بررسی برند"
            description="تعداد اشاره‌ها به برند، نمونهٔ پرسش‌ها و صفحات منبع را در پاسخ‌های چت‌جی‌پی‌تی و نمای هوش مصنوعی گوگل بررسی کنید."
            bullets={BRAND_LOOKUP_BULLETS}
          />
        ) : (
          <>
            <BrandLookupSearchCard
              query={query}
              onQueryChange={(next) => {
                setQuery(next);
                if (validationError) setValidationError(null);
              }}
              scope={selectedScope}
              onScopeChange={setScopeChoice}
              scopeDisabledReason={scopeDisabledReason}
              competitors={competitorsInput}
              onCompetitorsChange={(next) => {
                setCompetitorsInput(next);
                if (validationError) setValidationError(null);
              }}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              validationError={validationError}
            />

            {errorMessage ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {isLoading ? (
              <AiSearchLoadingState />
            ) : resultData ? (
              <>
                <div>
                  <Link
                    from="/p/$projectId/brand-lookup"
                    to="/p/$projectId/brand-lookup"
                    params={{ projectId }}
                    search={{ q: undefined, c: undefined, scope: undefined }}
                    replace
                    className="btn btn-ghost btn-sm gap-2 px-0 text-base-content/70 hover:bg-transparent"
                  >
                    <ArrowLeft className="size-4" />
                    Recent searches
                  </Link>
                </div>
                <BrandLookupResults result={resultData} projectId={projectId} />
              </>
            ) : !errorMessage ? (
              <BrandLookupHistorySection
                projectId={projectId}
                history={history}
                historyLoaded={historyLoaded}
                onRemoveHistoryItem={removeHistoryItem}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
