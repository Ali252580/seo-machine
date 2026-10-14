import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { AppError } from "@/server/lib/errors";
import {
  checkUsageCreditsDepleted,
  trackUsageCreditSpend,
} from "@/server/billing/subscription";
import { uploadWordPressArticleImage } from "@/server/features/wordpress/WordPressService";
import { requireOrgPermission } from "@/server/auth/org-gate";
import {
  decodeGeneratedImage,
  isArticleImageMime,
} from "@/server/features/wordpress/generatedImage";

const model = "black-forest-labs/flux.2-klein-4b";

export const generateArticleImage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    z.object({
      projectId: z.string().min(1),
      prompt: z.string().trim().min(20).max(1200),
      altText: z.string().trim().min(5).max(250),
    }),
  )
  .handler(async ({ context, data }) => {
    const apiKey = await getOptionalEnvValue("OPENROUTER_API_KEY");
    if (!apiKey)
      throw new AppError("INTERNAL_ERROR", "OpenRouter is not configured.");
    const customer = {
      userId: context.userId,
      userEmail: context.userEmail,
      organizationId: context.organizationId,
      projectId: context.projectId,
    };
    const balance = await checkUsageCreditsDepleted(customer);
    if (balance.depleted) throw new AppError("INSUFFICIENT_CREDITS");
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      signal: AbortSignal.timeout(100_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt: data.prompt }),
    });
    if (!response.ok)
      throw new AppError(
        "INTERNAL_ERROR",
        `Image provider returned ${response.status}`,
      );
    const result = z
      .object({
        data: z
          .array(z.object({ b64_json: z.string(), media_type: z.string() }))
          .min(1),
        usage: z.object({ cost: z.number() }).optional(),
      })
      .parse(await response.json());
    const encoded = result.data?.[0]?.b64_json;
    const mediaType = result.data?.[0]?.media_type;
    if (!encoded || !mediaType || !isArticleImageMime(mediaType))
      throw new AppError(
        "VALIDATION_ERROR",
        "Generated image is missing, unsupported or too large.",
      );
    decodeGeneratedImage(encoded, mediaType);
    const cost = result.usage?.cost;
    if (typeof cost === "number" && Number.isFinite(cost) && cost > 0) {
      await trackUsageCreditSpend({
        customer,
        customerId: context.organizationId,
        creditFeature: "agent",
        costUsd: cost,
        monthlyRemaining: balance.monthlyRemaining,
        properties: { provider: "openrouter", model, action: "article_image" },
      });
    } else {
      // shortcut: some image providers omit cost; reconcile these calls from OpenRouter activity before billing users.
      console.warn(
        "[article-image] OpenRouter response did not include usage.cost",
      );
    }
    // Review happens before a separate upload action; no CMS write here.
    return {
      id: 0,
      url: "",
      preview: `data:${mediaType};base64,${encoded}`,
      mediaType,
    };
  });

export const uploadReviewedArticleImage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    z.object({
      projectId: z.string().min(1),
      image: z.string().max(2_700_000),
      altText: z.string().trim().min(5).max(250),
    }),
  )
  .handler(async ({ context, data }) => {
    requireOrgPermission(context, { integration: ["manage"] });
    const match =
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        data.image,
      );
    if (!match) throw new AppError("VALIDATION_ERROR", "Invalid image data.");
    const mediaType = match[1];
    if (!isArticleImageMime(mediaType))
      throw new AppError("VALIDATION_ERROR", "Unsupported image type.");
    return uploadWordPressArticleImage(
      context.projectId,
      decodeGeneratedImage(match[2], mediaType),
      mediaType,
      data.altText,
    );
  });
