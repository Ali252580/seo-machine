import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  assertUsageCreditsAvailable,
  getOrCreateOrganizationCustomer,
  trackUsageCreditSpend,
} from "@/server/billing/subscription";
import { AppError } from "@/server/lib/errors";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import { getIsoCountryCode } from "@/shared/keyword-locations";
import { SERPAPI_SEARCH_COST_USD } from "@/shared/rank-tracking";

const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";
const PAGE_SIZE = 10;
const REQUEST_TIMEOUT_MS = 45_000;
const IRAN_LOCATION_CODE = 2364;
const TEHRAN_COORDINATES = { lat: "35.69439", lon: "51.42151" } as const;

const organicResultSchema = z
  .object({
    position: z.number().int().positive(),
    link: z.string().min(1),
    title: z.string().optional(),
  })
  .passthrough();

const responseSchema = z
  .object({
    search_metadata: z
      .object({ status: z.string().optional() })
      .passthrough()
      .optional(),
    search_information: z
      .object({ total_results: z.number().nonnegative().optional() })
      .passthrough()
      .optional(),
    organic_results: z.array(organicResultSchema).optional(),
    ads: z.array(z.unknown()).optional(),
    top_ads: z.array(z.unknown()).optional(),
    bottom_ads: z.array(z.unknown()).optional(),
    shopping_results: z.array(z.unknown()).optional(),
    error: z.string().optional(),
  })
  .passthrough();

type SerpApiResponse = z.infer<typeof responseSchema>;

export interface RankCheckResult {
  keywordId: string;
  keyword: string;
  position: number | null;
  url: string | null;
  serpFeatures: string[];
  estimatedSearchVolume: number;
  estimatedKeywordDifficulty: number;
  estimatedCpc: number;
}

export interface RankCheckInput {
  keyword: string;
  keywordId: string;
  locationCode: number;
  languageCode: string;
  locationName?: string;
  device: "desktop" | "mobile";
  targetDomain: string;
  depth: number;
}

class SerpApiRequestError extends AppError {
  constructor(
    code: ConstructorParameters<typeof AppError>[0],
    message: string,
    readonly searchesUsed: number,
  ) {
    super(code, message);
    this.name = "SerpApiRequestError";
  }
}

function normalizedHostname(value: string): string | null {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchesDomain(link: string, targetDomain: string): boolean {
  const hostname = normalizedHostname(link);
  const target = normalizedHostname(targetDomain);
  if (!target) return false;
  return hostname === target || Boolean(hostname?.endsWith("." + target));
}

function canonicalResultUrl(link: string): string {
  try {
    const url = new URL(link);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname.endsWith("google.com") && url.pathname === "/url") {
      const destination =
        url.searchParams.get("url") ?? url.searchParams.get("q");
      if (destination && /^https?:\/\//i.test(destination)) return destination;
    }
    return url.toString();
  } catch {
    return link;
  }
}

const COMMERCIAL_TERMS = [
  "buy",
  "price",
  "cost",
  "hire",
  "service",
  "shop",
  "order",
  "quote",
  "خرید",
  "قیمت",
  "هزینه",
  "فروش",
  "سفارش",
  "اجرا",
  "نصب",
  "خدمات",
];

function roundVolume(value: number): number {
  const safe = Math.max(10, Math.min(100_000, value));
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const normalized = safe / magnitude;
  const bucket =
    normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return bucket * magnitude;
}

export function estimateSerpMetrics(
  response: SerpApiResponse,
  input: Pick<RankCheckInput, "keyword" | "locationCode" | "locationName">,
): { searchVolume: number; keywordDifficulty: number; cpc: number } {
  const totalResults = response.search_information?.total_results ?? 0;
  const organic = response.organic_results ?? [];
  const keyword = input.keyword.trim().toLocaleLowerCase();
  const exactTitleRatio = organic.length
    ? organic.filter((result) =>
        result.title?.toLocaleLowerCase().includes(keyword),
      ).length / organic.length
    : 0;
  const features = Math.max(0, collectSerpFeatures(response).length - 1);
  const adCount =
    (response.ads?.length ?? 0) +
    (response.top_ads?.length ?? 0) +
    (response.bottom_ads?.length ?? 0);
  const shoppingCount = response.shopping_results?.length ?? 0;
  const commercialMatches = COMMERCIAL_TERMS.filter((term) =>
    keyword.includes(term),
  ).length;
  const localFactor =
    input.locationCode === IRAN_LOCATION_CODE || input.locationName ? 0.35 : 1;
  const demandMultiplier =
    1 + Math.min(features, 5) * 0.08 + Math.min(adCount, 4) * 0.12;
  const searchVolume = roundVolume(
    Math.sqrt(Math.max(totalResults, 1)) * 10 * demandMultiplier * localFactor,
  );
  const resultCompetition =
    (Math.min(9, Math.log10(Math.max(totalResults, 1))) / 9) * 45;
  const keywordDifficulty = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        10 +
          resultCompetition +
          exactTitleRatio * 25 +
          Math.min(15, features * 3) +
          Math.min(15, adCount * 4),
      ),
    ),
  );
  const cpc = Number(
    Math.min(
      25,
      0.05 +
        adCount * 0.35 +
        Math.min(3, commercialMatches) * 0.4 +
        (shoppingCount > 0 ? 0.45 : 0),
    ).toFixed(2),
  );
  return { searchVolume, keywordDifficulty, cpc };
}

const IGNORED_RESULT_KEYS = new Set([
  "search_metadata",
  "search_parameters",
  "search_information",
  "organic_results",
  "pagination",
  "serpapi_pagination",
  "error",
]);

function collectSerpFeatures(response: SerpApiResponse): string[] {
  const features = new Set<string>();
  if ((response.organic_results?.length ?? 0) > 0) features.add("organic");

  for (const [key, value] of Object.entries(response)) {
    if (IGNORED_RESULT_KEYS.has(key) || value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }
    features.add(key.replace(/_results$/, ""));
  }
  return [...features];
}

function classifyHttpError(
  status: number,
): ConstructorParameters<typeof AppError>[0] {
  if (status === 401 || status === 403) return "AUTH_CONFIG_MISSING";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "UPSTREAM_UNAVAILABLE";
  return "VALIDATION_ERROR";
}

async function fetchPage(
  apiKey: string,
  input: RankCheckInput,
  start: number,
): Promise<SerpApiResponse> {
  const url = new URL(SERPAPI_SEARCH_URL);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", input.keyword);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("device", input.device);
  url.searchParams.set("hl", input.languageCode);
  url.searchParams.set("gl", getIsoCountryCode(input.locationCode));
  url.searchParams.set("google_domain", "google.com");
  url.searchParams.set("num", String(PAGE_SIZE));
  url.searchParams.set("no_cache", "true");
  if (input.locationName) url.searchParams.set("location", input.locationName);
  const normalizedLocationName = input.locationName?.trim().toLowerCase();
  const targetsTehran =
    !normalizedLocationName ||
    normalizedLocationName.includes("tehran") ||
    normalizedLocationName.includes("تهران");
  if (input.locationCode === IRAN_LOCATION_CODE && targetsTehran) {
    url.searchParams.set("lat", TEHRAN_COORDINATES.lat);
    url.searchParams.set("lon", TEHRAN_COORDINATES.lon);
  }
  if (start > 0) url.searchParams.set("start", String(start));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      error instanceof Error ? error.message : "SerpApi request failed",
    );
  }

  if (!response.ok) {
    throw new AppError(
      classifyHttpError(response.status),
      "SerpApi request failed with HTTP " + response.status,
    );
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "SerpApi returned an invalid response",
    );
  }
  if (parsed.data.error) {
    const lower = parsed.data.error.toLowerCase();
    const code =
      lower.includes("rate") || lower.includes("limit")
        ? "RATE_LIMITED"
        : lower.includes("api key")
          ? "AUTH_CONFIG_MISSING"
          : "UPSTREAM_UNAVAILABLE";
    throw new AppError(code, parsed.data.error);
  }
  return parsed.data;
}

export async function fetchSerpApiRankCheck(
  apiKey: string,
  input: RankCheckInput,
): Promise<{ data: RankCheckResult; searchesUsed: number }> {
  const maxPages = Math.max(
    1,
    Math.min(10, Math.ceil(input.depth / PAGE_SIZE)),
  );
  const features = new Set<string>();
  let searchesUsed = 0;
  let estimatedMetrics = { searchVolume: 10, keywordDifficulty: 10, cpc: 0.05 };

  for (let page = 0; page < maxPages; page++) {
    let response: SerpApiResponse;
    try {
      response = await fetchPage(apiKey, input, page * PAGE_SIZE);
      searchesUsed += 1;
    } catch (error) {
      if (error instanceof AppError) {
        throw new SerpApiRequestError(error.code, error.message, searchesUsed);
      }
      throw error;
    }

    for (const feature of collectSerpFeatures(response)) features.add(feature);
    if (page === 0) estimatedMetrics = estimateSerpMetrics(response, input);
    const match = response.organic_results?.find((item) =>
      matchesDomain(canonicalResultUrl(item.link), input.targetDomain),
    );
    if (match) {
      return {
        data: {
          keywordId: input.keywordId,
          keyword: input.keyword,
          position: page * PAGE_SIZE + match.position,
          url: canonicalResultUrl(match.link),
          serpFeatures: [...features],
          estimatedSearchVolume: estimatedMetrics.searchVolume,
          estimatedKeywordDifficulty: estimatedMetrics.keywordDifficulty,
          estimatedCpc: estimatedMetrics.cpc,
        },
        searchesUsed,
      };
    }

    if ((response.organic_results?.length ?? 0) < PAGE_SIZE) break;
  }

  return {
    data: {
      keywordId: input.keywordId,
      keyword: input.keyword,
      position: null,
      url: null,
      serpFeatures: [...features],
      estimatedSearchVolume: estimatedMetrics.searchVolume,
      estimatedKeywordDifficulty: estimatedMetrics.keywordDifficulty,
      estimatedCpc: estimatedMetrics.cpc,
    },
    searchesUsed,
  };
}

async function trackSerpApiUsage(input: {
  customer: BillingCustomerContext;
  customerId: string;
  monthlyRemaining: number;
  searchesUsed: number;
}) {
  if (input.searchesUsed <= 0) return;
  await trackUsageCreditSpend({
    customer: input.customer,
    customerId: input.customerId,
    creditFeature: "rank_tracking",
    costUsd: input.searchesUsed * SERPAPI_SEARCH_COST_USD,
    monthlyRemaining: input.monthlyRemaining,
    properties: {
      provider: "serpapi",
      searches: input.searchesUsed,
      fromCache: false,
    },
  });
}

export function createSerpApiRankClient(customer: BillingCustomerContext) {
  return {
    rankCheck: async (input: RankCheckInput): Promise<RankCheckResult> => {
      const apiKey = (await getOptionalEnvValue("SERPAPI_API_KEY"))?.trim();
      if (!apiKey) {
        throw new AppError(
          "AUTH_CONFIG_MISSING",
          "Rank tracking requires SERPAPI_API_KEY.",
        );
      }

      if (!(await isHostedServerAuthMode())) {
        return (await fetchSerpApiRankCheck(apiKey, input)).data;
      }

      const billingCustomer = await getOrCreateOrganizationCustomer(customer);
      const { monthlyRemaining } = await assertUsageCreditsAvailable(
        billingCustomer.id,
      );

      try {
        const result = await fetchSerpApiRankCheck(apiKey, input);
        await trackSerpApiUsage({
          customer,
          customerId: billingCustomer.id,
          monthlyRemaining,
          searchesUsed: result.searchesUsed,
        });
        return result.data;
      } catch (error) {
        if (error instanceof SerpApiRequestError) {
          await trackSerpApiUsage({
            customer,
            customerId: billingCustomer.id,
            monthlyRemaining,
            searchesUsed: error.searchesUsed,
          });
        }
        throw error;
      }
    },
  } as const;
}

export type SerpApiRankClient = ReturnType<typeof createSerpApiRankClient>;
