import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireOrgPermission } from "@/server/auth/org-gate";
import {
  createNextPayTopup,
  getBillingSummary,
  verifyUsdtTopup,
} from "@/server/billing/payments";
import { getOrCreateOrganizationCustomer } from "@/server/billing/subscription";
import { getPublicOrigin } from "@/server/mcp/public-origin";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import { CREDIT_PACKAGES_USD } from "@/shared/billing";

const packageSchema = z.object({
  amountUsd: z
    .number()
    .refine(
      (amount) => CREDIT_PACKAGES_USD.some((value) => value === amount),
      "Invalid credit package",
    ),
});
const billingUsagePropertySchema = z.json();

export const getBillingAccount = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    await getOrCreateOrganizationCustomer(context);
    return getBillingSummary(context.organizationId);
  });

export const createNextPayCheckout = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(packageSchema)
  .handler(async ({ data, context }) => {
    requireOrgPermission(context, { billing: ["manage"] });
    await getOrCreateOrganizationCustomer(context);
    const callbackUrl = new URL(
      "/api/billing/nextpay/callback",
      getPublicOrigin(getRequest()),
    ).toString();
    return {
      url: await createNextPayTopup({
        organizationId: context.organizationId,
        amountUsd: data.amountUsd,
        callbackUrl,
      }),
    };
  });

export const confirmUsdtTopup = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(
    packageSchema.extend({
      transactionId: z
        .string()
        .trim()
        .regex(/^[a-fA-F0-9]{64}$/),
    }),
  )
  .handler(async ({ data, context }) => {
    requireOrgPermission(context, { billing: ["manage"] });
    await getOrCreateOrganizationCustomer(context);
    return verifyUsdtTopup({
      organizationId: context.organizationId,
      amountUsd: data.amountUsd,
      transactionId: data.transactionId,
    });
  });

export type BillingUsageEvent = {
  value: number;
  properties: Record<string, z.infer<typeof billingUsagePropertySchema>>;
};

export const getBillingUsageEvents = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(z.object({ start: z.number(), end: z.number() }))
  .handler(async (): Promise<BillingUsageEvent[]> => []);
