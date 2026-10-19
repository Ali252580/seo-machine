import { ga4ConnectionOptions } from "@/client/features/integrations/googleConnectionQueries";
import * as React from "react";
import { GoogleConnectedState } from "@/client/features/integrations/GoogleConnectedState";
import { useGooglePickerResume } from "@/client/features/integrations/useGooglePickerResume";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ga4PropertyPicker,
  type Ga4PropertySelection,
} from "@/client/features/ga4/Ga4PropertyPicker";
import { GoogleProjectEmptyState } from "@/client/features/integrations/GoogleProjectEmptyState";
import { GoogleLinkErrorAlert } from "@/client/features/integrations/GoogleLinkErrorAlert";
import { GoogleOAuthSetupWarning } from "@/client/features/integrations/GoogleOAuthSetupWarning";
import { IntegrationConnectionCard } from "@/client/features/integrations/IntegrationConnectionCard";
import { GoogleAnalyticsLogo } from "@/client/features/integrations/GoogleProductLogos";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import {
  disconnectGa4,
  listGa4Properties,
  setGa4Property,
} from "@/serverFunctions/ga4";
import { GA4_SELF_HOSTED_SETUP_DOCS_URL } from "@/shared/ga4";

// oxlint-disable-next-line complexity -- project-scoped async guards extend an existing connection card.
export function GoogleAnalyticsConnectionCard({
  projectId,
  onDismiss,
  dismissing = false,
  heading,
}: {
  projectId: string;
  onDismiss?: () => void;
  dismissing?: boolean;
  heading?: React.ReactNode;
}) {
  const hosted = isHostedClientAuthMode();
  const queryClient = useQueryClient();
  const currentProjectId = React.useRef(projectId);
  currentProjectId.current = projectId;
  const { picking, setPicking, linkAccount, linking } = useGooglePickerResume(
    "ga4",
    projectId,
  );
  const [projectSelection, setProjectSelection] = React.useState<{
    projectId: string;
    value: Ga4PropertySelection | null;
  } | null>(null);
  const selection =
    projectSelection?.projectId === projectId ? projectSelection.value : null;
  const setSelection = (value: Ga4PropertySelection | null) =>
    setProjectSelection({ projectId, value });
  const connectionOptions = ga4ConnectionOptions(projectId);
  const connectionQuery = useQuery(connectionOptions);
  const connection = connectionQuery.data;
  const connectionUnavailable = connectionQuery.isError && !connection;
  const connected = Boolean(connection?.connected);
  const hasGrant = Boolean(connection?.currentUserHasGrant);
  const canManage = connection?.canManage === true;
  const selfHostedNeedsSetup =
    !hosted && connectionQuery.isSuccess && !connection?.googleOAuthConfigured;
  const showPicker = picking ?? (!connected && hasGrant && canManage);
  const propertiesQuery = useQuery({
    queryKey: ["ga4Properties", projectId],
    queryFn: () => listGa4Properties({ data: { projectId } }),
    enabled: Boolean(showPicker && !selfHostedNeedsSetup),
  });
  const accounts = React.useMemo(
    () => propertiesQuery.data?.accounts ?? [],
    [propertiesQuery.data?.accounts],
  );

  React.useEffect(() => {
    if (!picking || !connected || selection) return;
    for (const account of accounts) {
      const selectedProperty = account.properties.find(
        (property) => property.isSelected,
      );
      if (selectedProperty) {
        setProjectSelection({
          projectId,
          value: {
            accountId: account.accountId,
            propertyId: selectedProperty.propertyId,
          },
        });
        return;
      }
    }
  }, [accounts, selection, picking, connected, projectId]);

  const invalidateReports = (changedProjectId: string) => {
    void queryClient.invalidateQueries({
      queryKey: ["dashboardActivation", changedProjectId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["dashboardGa4Report", changedProjectId],
    });
  };
  const setPropertyMutation = useMutation({
    mutationFn: ({
      projectId: targetProjectId,
      selected,
    }: {
      projectId: string;
      selected: Ga4PropertySelection;
    }) => setGa4Property({ data: { projectId: targetProjectId, ...selected } }),
    onSuccess: (saved, { projectId: savedProjectId }) => {
      queryClient.setQueryData(
        ga4ConnectionOptions(savedProjectId).queryKey,
        (current: typeof connection) =>
          current ? { ...current, ...saved } : current,
      );
      captureClientEvent("ga4:property_select");
      toast.success("Google Analytics connected");
      queryClient.removeQueries({
        queryKey: ["ga4Properties", savedProjectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ga4ConnectionOptions(savedProjectId).queryKey,
      });
      if (currentProjectId.current === savedProjectId) setPicking(false);
      invalidateReports(savedProjectId);
    },
  });
  const disconnectMutation = useMutation({
    mutationFn: (targetProjectId: string) =>
      disconnectGa4({ data: { projectId: targetProjectId } }),
    onSuccess: (_, disconnectedProjectId) => {
      toast.success("Google Analytics disconnected from this project");
      queryClient.setQueryData(
        ga4ConnectionOptions(disconnectedProjectId).queryKey,
        (current: typeof connection) =>
          current ? { ...current, connected: false } : current,
      );
      queryClient.removeQueries({
        queryKey: ["ga4Properties", disconnectedProjectId],
      });
      if (currentProjectId.current === disconnectedProjectId) {
        setPicking(false);
        setSelection(null);
      }
      void queryClient.invalidateQueries({
        queryKey: ga4ConnectionOptions(disconnectedProjectId).queryKey,
      });
      invalidateReports(disconnectedProjectId);
    },
  });
  const changingConnection =
    setPropertyMutation.isPending || disconnectMutation.isPending || linking;
  const dismissDisabled = dismissing || changingConnection;
  const handleConnect = () => void linkAccount(window.location.href);

  return (
    <>
      {heading}
      <IntegrationConnectionCard
        title="Google Analytics"
        icon={<GoogleAnalyticsLogo className="size-5" />}
        status={
          connectionQuery.isPending || connectionUnavailable
            ? undefined
            : selfHostedNeedsSetup
              ? "setup_required"
              : connected
                ? "connected"
                : "disconnected"
        }
      >
        <GoogleLinkErrorAlert
          provider="ga4"
          projectId={projectId}
          className="mb-4"
        />
        {connectionQuery.isPending ? (
          <div
            role="status"
            aria-label="Loading connection"
            className="space-y-3 animate-pulse"
          >
            <div className="h-4 w-2/3 rounded bg-base-200" />
            <div className="h-9 w-24 rounded bg-base-200" />
          </div>
        ) : connectionUnavailable ? (
          <div role="alert" className="space-y-3 text-sm">
            <p className="text-error">
              Couldn't check this project's connection.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void connectionQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : selfHostedNeedsSetup ? (
          <div className="space-y-3">
            <GoogleOAuthSetupWarning
              integrationName="Google Analytics"
              docsUrl={GA4_SELF_HOSTED_SETUP_DOCS_URL}
            />
            <DismissButton onClick={onDismiss} disabled={dismissDisabled} />
          </div>
        ) : connected && !picking ? (
          <GoogleConnectedState
            property={connection?.propertyDisplayName ?? ""}
            detail={connection?.propertyId}
            canManageAccounts={hasGrant}
            email={connection?.connectedByEmail}
            onChange={() => {
              setPropertyMutation.reset();
              disconnectMutation.reset();
              setSelection(null);
              setPicking(true);
            }}
            onDisconnect={() => {
              setPropertyMutation.reset();
              disconnectMutation.mutate(projectId);
            }}
            disconnecting={disconnectMutation.isPending}
            disabled={linking}
            canManage={canManage}
          />
        ) : showPicker ? (
          <fieldset disabled={changingConnection}>
            <Ga4PropertyPicker
              key={projectId}
              readOnly={!canManage}
              linking={linking}
              loading={propertiesQuery.isLoading}
              error={propertiesQuery.isError}
              accounts={accounts}
              selection={selection}
              onSelect={setSelection}
              onSave={() =>
                selection &&
                setPropertyMutation.mutate({ projectId, selected: selection })
              }
              saving={setPropertyMutation.isPending}
              secondaryAction={{
                label: "Cancel",
                disabled: setPropertyMutation.isPending,
                onClick: () => {
                  setPicking(false);
                  setSelection(null);
                  setPropertyMutation.reset();
                },
              }}
              onRetry={() => void propertiesQuery.refetch()}
              onReconnect={handleConnect}
            />
          </fieldset>
        ) : (
          <GoogleProjectEmptyState
            name="Google Analytics"
            hasGrant={hasGrant}
            canManage={canManage}
            disabled={linking}
            onLink={handleConnect}
            onChoose={() => {
              setPropertyMutation.reset();
              disconnectMutation.reset();
              setSelection(null);
              setPicking(true);
            }}
          >
            <DismissButton onClick={onDismiss} disabled={dismissDisabled} />
          </GoogleProjectEmptyState>
        )}
        {showPicker && onDismiss && !connected ? (
          <DismissButton onClick={onDismiss} disabled={dismissDisabled} />
        ) : null}
        {setPropertyMutation.isError || disconnectMutation.isError ? (
          <p role="alert" className="mt-3 text-sm text-error">
            {getStandardErrorMessage(
              setPropertyMutation.error ?? disconnectMutation.error,
            )}
          </p>
        ) : null}
        {connectionQuery.isSuccess && !selfHostedNeedsSetup && !canManage ? (
          <p className="mt-3 text-sm text-base-content/60">
            Ask an organization owner or admin to change this project's
            connection.
          </p>
        ) : null}
      </IntegrationConnectionCard>
    </>
  );
}

function DismissButton({
  onClick,
  disabled,
}: {
  onClick?: () => void;
  disabled: boolean;
}) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm text-base-content/60"
      onClick={onClick}
      disabled={disabled}
    >
      Dismiss
    </button>
  );
}
