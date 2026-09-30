import { AuditHistorySection } from "@/client/features/audit/launch/AuditHistorySection";
import { LaunchFormCard } from "@/client/features/audit/launch/LaunchFormCard";
import { useLaunchController } from "@/client/features/audit/launch/useLaunchController";
import { useBillingAccount } from "@/client/features/billing/useBillingAccount";
import { isHostedClientAuthMode } from "@/lib/auth-mode";

type LaunchViewProps = {
  projectId: string;
  onAuditStarted: (auditId: string) => void;
};

export function LaunchView(props: LaunchViewProps) {
  // Self-hosted has no Autumn customer and resolves to the paid tier on the
  // server, so only hosted mode needs to look up the plan.
  if (!isHostedClientAuthMode()) {
    return <LaunchContent {...props} isFreePlan={false} />;
  }

  return <HostedLaunchView {...props} />;
}

function HostedLaunchView(props: LaunchViewProps) {
  const account = useBillingAccount();
  const isFreePlan = account.data ? !account.data.isPaying : false;

  return <LaunchContent {...props} isFreePlan={isFreePlan} />;
}

function LaunchContent({
  projectId,
  isFreePlan,
  onAuditStarted,
}: LaunchViewProps & { isFreePlan: boolean }) {
  const controller = useLaunchController({
    projectId,
    isFreePlan,
    onAuditStarted,
  });

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">ممیزی سایت</h1>

        <LaunchFormCard
          launchForm={controller.launchForm}
          commitMaxPagesInput={controller.commitMaxPagesInput}
          maxPagesLimit={controller.maxPagesLimit}
        />

        <AuditHistorySection
          projectId={projectId}
          history={controller.historyQuery.data ?? []}
          isLoading={controller.historyQuery.isLoading}
          onDelete={controller.deleteAudit}
        />
      </div>
    </div>
  );
}
