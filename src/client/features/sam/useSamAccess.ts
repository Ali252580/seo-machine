import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { getSamAccessSetupStatus } from "@/serverFunctions/samAccess";

type SamAccess = {
  isChecking: boolean;
  showSetupGate: boolean;
  errorMessage: string | null;
  reason: "missing_key" | "missing_database" | null;
  hasApiKey: boolean | null;
  runtime: "vercel" | "cloudflare" | null;
  isRefetching: boolean;
  onRetry: () => void;
};

export function useSamAccess(projectId: string): SamAccess {
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["samAccessStatus", projectId],
    queryFn: () => getSamAccessSetupStatus({ data: { projectId } }),
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    isChecking: isPending,
    showSetupGate: !isPending && !(data?.enabled ?? false),
    errorMessage:
      data?.errorMessage ??
      (error
        ? getStandardErrorMessage(
            error,
            "وضعیت راه‌اندازی عامل هوشمند دریافت نشد.",
          )
        : null),
    reason: data?.reason ?? null,
    hasApiKey: data?.hasApiKey ?? null,
    runtime: data?.runtime ?? null,
    isRefetching,
    onRetry,
  };
}
