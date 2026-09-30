import { queryOptions, useQuery } from "@tanstack/react-query";
import { getBillingAccount } from "@/serverFunctions/billing";

export const billingAccountQueryOptions = () =>
  queryOptions({
    queryKey: ["billing-account"],
    queryFn: () => getBillingAccount(),
    staleTime: 15_000,
  });

export function useBillingAccount() {
  return useQuery(billingAccountQueryOptions());
}
