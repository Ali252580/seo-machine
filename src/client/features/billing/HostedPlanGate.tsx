import type { ReactNode } from "react";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { useBillingAccount } from "@/client/features/billing/useBillingAccount";

export type HostedPlanGateState = {
  isLoading: boolean;
  isFreePlan: boolean;
};

const SELF_HOSTED_PLAN_GATE: HostedPlanGateState = {
  isLoading: false,
  isFreePlan: false,
};

export function HostedPlanGate({
  children,
}: {
  children: (state: HostedPlanGateState) => ReactNode;
}) {
  if (!isHostedClientAuthMode()) {
    return children(SELF_HOSTED_PLAN_GATE);
  }

  return <HostedPlanGateContent>{children}</HostedPlanGateContent>;
}

function HostedPlanGateContent({
  children,
}: {
  children: (state: HostedPlanGateState) => ReactNode;
}) {
  const account = useBillingAccount();

  return children({
    isLoading: account.isLoading,
    isFreePlan: account.data ? !account.data.isPaying : false,
  });
}
