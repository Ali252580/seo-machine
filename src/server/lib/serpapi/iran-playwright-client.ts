import { z } from "zod";
import { AppError } from "@/server/lib/errors";

const REQUEST_TIMEOUT_MS = 45_000;

const iranPlaywrightResponseSchema = z
  .object({
    search_metadata: z
      .object({ status: z.string().optional() })
      .passthrough()
      .optional(),
    search_information: z
      .object({ total_results: z.number().nonnegative().optional() })
      .passthrough()
      .optional(),
    organic_results: z
      .array(
        z
          .object({
            position: z.number().int().positive(),
            link: z.string().min(1),
            title: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    serp_features: z.array(z.string()).optional(),
    pages_used: z.number().int().positive().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export type IranPlaywrightResponse = z.infer<
  typeof iranPlaywrightResponseSchema
>;

export interface IranPlaywrightRequest {
  keyword: string;
  languageCode: string;
  locationName?: string;
  device: "desktop" | "mobile";
  depth: number;
}

/** Calls the private browser service used only for Iranian Google results. */
export async function fetchIranPlaywrightResults(
  endpoint: string,
  secret: string | undefined,
  input: IranPlaywrightRequest,
): Promise<IranPlaywrightResponse> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        query: input.keyword,
        country: "ir",
        language: input.languageCode || "fa",
        device: input.device,
        depth: input.depth,
        location: input.locationName ?? "Tehran,Tehran Province,Iran",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      error instanceof Error
        ? error.message
        : "Iran Playwright rank service request failed",
    );
  }

  if (!response.ok) {
    const code =
      response.status === 401 || response.status === 403
        ? "AUTH_CONFIG_MISSING"
        : response.status === 429
          ? "RATE_LIMITED"
          : response.status >= 500
            ? "UPSTREAM_UNAVAILABLE"
            : "VALIDATION_ERROR";
    throw new AppError(
      code,
      "Iran Playwright rank service failed with HTTP " + response.status,
    );
  }

  const parsed = iranPlaywrightResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AppError(
      "UPSTREAM_UNAVAILABLE",
      "Iran Playwright rank service returned an invalid response",
    );
  }
  if (parsed.data.error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", parsed.data.error);
  }
  return parsed.data;
}
