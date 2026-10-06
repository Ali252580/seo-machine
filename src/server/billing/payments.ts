import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { billingCustomerStatus, billingPayments } from "@/db/schema";
import { runBatch } from "@/db/runBatch";
import { AppError } from "@/server/lib/errors";
import {
  getOptionalEnvValue,
  getRequiredEnvValue,
} from "@/server/lib/runtime-env";
import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  CREDIT_PACKAGES_USD,
} from "@/shared/billing";

const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const PACKAGES = CREDIT_PACKAGES_USD;

export function parseCreditPackage(amountUsd: number) {
  if (!PACKAGES.includes(amountUsd as (typeof PACKAGES)[number])) {
    throw new AppError("VALIDATION_ERROR", "Invalid credit package");
  }
  return {
    amountUsd,
    amountCredits: amountUsd * AUTUMN_SEO_DATA_CREDITS_PER_USD,
  };
}

export async function getBillingSummary(organizationId: string) {
  const [status] = await db
    .select({
      balance: billingCustomerStatus.creditBalance,
      isPaying: billingCustomerStatus.isPaying,
    })
    .from(billingCustomerStatus)
    .where(eq(billingCustomerStatus.organizationId, organizationId))
    .limit(1);
  return {
    credits: status?.balance ?? 0,
    balanceUsd: (status?.balance ?? 0) / AUTUMN_SEO_DATA_CREDITS_PER_USD,
    isPaying: (status?.balance ?? 0) > 0,
    nextPayEnabled:
      Boolean(await getOptionalEnvValue("NEXTPAY_API_KEY")) &&
      Boolean(await getOptionalEnvValue("BILLING_IRT_PER_USD")),
    usdtEnabled: Boolean(
      await getOptionalEnvValue("USDT_TRC20_WALLET_ADDRESS"),
    ),
    usdtWallet:
      (await getOptionalEnvValue("USDT_TRC20_WALLET_ADDRESS")) ?? null,
  };
}

async function creditVerifiedPayment(
  paymentId: string,
  organizationId: string,
) {
  const now = new Date().toISOString();
  const claim = `crediting:${crypto.randomUUID()}`;
  await runBatch((tx) => [
    tx
      .update(billingPayments)
      .set({ status: sql`${claim}`, updatedAt: now })
      .where(
        and(
          eq(billingPayments.id, paymentId),
          eq(billingPayments.organizationId, organizationId),
          eq(billingPayments.status, "verified"),
        ),
      ),
    tx
      .update(billingCustomerStatus)
      .set({
        creditBalance: sql`${billingCustomerStatus.creditBalance} + (SELECT amount_credits FROM billing_payments WHERE id = ${paymentId})`,
        isPaying: true,
        paidPlanId: "wallet",
        paidPlanStatus: "active",
        updatedAt: now,
      })
      .where(
        and(
          eq(billingCustomerStatus.organizationId, organizationId),
          sql`EXISTS (SELECT 1 FROM billing_payments WHERE id = ${paymentId} AND organization_id = ${organizationId} AND status = ${claim})`,
        ),
      ),
    tx
      .update(billingPayments)
      .set({ status: "credited", updatedAt: now })
      .where(
        and(
          eq(billingPayments.id, paymentId),
          eq(billingPayments.organizationId, organizationId),
          sql`${billingPayments.status} = ${claim}`,
        ),
      ),
  ]);
}

export async function createNextPayTopup(args: {
  organizationId: string;
  amountUsd: number;
  callbackUrl: string;
}) {
  const pack = parseCreditPackage(args.amountUsd);
  const apiKey = await getRequiredEnvValue("NEXTPAY_API_KEY");
  const rate = Number(await getRequiredEnvValue("BILLING_IRT_PER_USD"));
  if (!Number.isInteger(rate) || rate <= 0) {
    throw new AppError("INTERNAL_ERROR", "Invalid BILLING_IRT_PER_USD");
  }
  const id = crypto.randomUUID();
  const amountIrt = pack.amountUsd * rate;
  await db.insert(billingPayments).values({
    id,
    organizationId: args.organizationId,
    provider: "nextpay",
    amountCredits: pack.amountCredits,
    amountIrt,
  });

  const response = await fetch("https://nextpay.org/nx/gateway/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      order_id: id,
      amount: amountIrt,
      callback_uri: args.callbackUrl,
      currency: "IRT",
    }),
  });
  const result = (await response.json()) as {
    code?: number;
    trans_id?: string;
  };
  if (!response.ok || result.code !== -1 || !result.trans_id) {
    await db
      .update(billingPayments)
      .set({ status: "failed", updatedAt: new Date().toISOString() })
      .where(eq(billingPayments.id, id));
    throw new AppError("UPSTREAM_UNAVAILABLE", "NextPay token failed");
  }
  await db
    .update(billingPayments)
    .set({ providerRef: result.trans_id, updatedAt: new Date().toISOString() })
    .where(eq(billingPayments.id, id));
  return `https://nextpay.org/nx/gateway/payment/${result.trans_id}`;
}

export async function verifyNextPayTopup(transId: string) {
  const [payment] = await db
    .select()
    .from(billingPayments)
    .where(
      and(
        eq(billingPayments.provider, "nextpay"),
        eq(billingPayments.providerRef, transId),
      ),
    )
    .limit(1);
  if (!payment || payment.amountIrt == null) return false;
  if (payment.status === "credited") return true;

  const response = await fetch("https://nextpay.org/nx/gateway/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: await getRequiredEnvValue("NEXTPAY_API_KEY"),
      trans_id: transId,
      amount: payment.amountIrt,
    }),
  });
  const result = (await response.json()) as { code?: number };
  if (!response.ok || result.code !== 0) return false;
  await db
    .update(billingPayments)
    .set({ status: "verified", updatedAt: new Date().toISOString() })
    .where(eq(billingPayments.id, payment.id));
  await creditVerifiedPayment(payment.id, payment.organizationId);
  return true;
}

type TronTransfer = {
  transaction_id?: string;
  to?: string;
  value?: string;
  token_info?: { address?: string; decimals?: number };
};

export function isValidUsdtTransfer(
  transfer: TronTransfer | undefined,
  wallet: string,
  amountUsd: number,
) {
  const decimals = transfer?.token_info?.decimals ?? 6;
  const receivedMicros = Number(transfer?.value ?? 0) / 10 ** (decimals - 6);
  return Boolean(
    transfer &&
    transfer.to === wallet &&
    transfer.token_info?.address === USDT_TRC20_CONTRACT &&
    receivedMicros >= amountUsd * 1_000_000,
  );
}

export async function verifyUsdtTopup(args: {
  organizationId: string;
  amountUsd: number;
  transactionId: string;
}) {
  const pack = parseCreditPackage(args.amountUsd);
  const wallet = await getRequiredEnvValue("USDT_TRC20_WALLET_ADDRESS");
  const url = new URL(
    `https://api.trongrid.io/v1/accounts/${encodeURIComponent(wallet)}/transactions/trc20`,
  );
  url.searchParams.set("only_confirmed", "true");
  url.searchParams.set("contract_address", USDT_TRC20_CONTRACT);
  url.searchParams.set("limit", "200");
  const headers = new Headers({ Accept: "application/json" });
  const tronGridKey = await getOptionalEnvValue("TRONGRID_API_KEY");
  if (tronGridKey) headers.set("TRON-PRO-API-KEY", tronGridKey);
  const response = await fetch(url, { headers });
  const result = (await response.json()) as { data?: TronTransfer[] };
  const transfer = result.data?.find(
    (item) => item.transaction_id === args.transactionId,
  );
  if (!response.ok || !isValidUsdtTransfer(transfer, wallet, pack.amountUsd)) {
    throw new AppError("VALIDATION_ERROR", "USDT transfer not found");
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(billingPayments).values({
      id,
      organizationId: args.organizationId,
      provider: "usdt_trc20",
      status: "verified",
      amountCredits: pack.amountCredits,
      amountUsdtMicros: pack.amountUsd * 1_000_000,
      providerRef: args.transactionId,
    });
  } catch {
    throw new AppError("VALIDATION_ERROR", "Transaction already used");
  }
  await creditVerifiedPayment(id, args.organizationId);
  return getBillingSummary(args.organizationId);
}
