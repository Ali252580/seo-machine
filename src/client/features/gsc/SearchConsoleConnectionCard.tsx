import { gscConnectionOptions } from "@/client/features/integrations/googleConnectionQueries";
import * as React from "react";
import { GoogleConnectedState } from "@/client/features/integrations/GoogleConnectedState";
import { useGooglePickerResume } from "@/client/features/integrations/useGooglePickerResume";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { GoogleProjectEmptyState } from "@/client/features/integrations/GoogleProjectEmptyState";
import { GoogleLinkErrorAlert } from "@/client/features/integrations/GoogleLinkErrorAlert";
import { IntegrationConnectionCard } from "@/client/features/integrations/IntegrationConnectionCard";
import { GoogleSearchConsoleLogo } from "@/client/features/integrations/GoogleProductLogos";
import { SelfHostedSetupWarning } from "@/client/features/gsc/SelfHostedSetupWarning";
import {
  SitePicker,
  type GscSiteSelection,
} from "@/client/features/gsc/SitePicker";
import { disconnectGsc, listGscSites, setGscSite } from "@/serverFunctions/gsc";

const GRANT_STATUS_KEY = ["gscGrantStatus"];

export function SearchConsoleConnectionCard({
  projectId,
  returnTo,
}: {
  projectId: string;
  returnTo?: string;
}) {
  const hosted = isHostedClientAuthMode();
  const queryClient = useQueryClient();
  const currentProjectId = React.useRef(projectId);
  currentProjectId.current = projectId;
  const { picking, setPicking, linkAccount, linking } = useGooglePickerResume(
    "gsc",
    projectId,
  );
  const [projectSelection, setProjectSelection] = React.useState<{
    projectId: string;
    value: GscSiteSelection | null;
  } | null>(null);
  const selection =
    projectSelection?.projectId === projectId ? projectSelection.value : null;
  const setSelection = (value: GscSiteSelection | null) =>
    setProjectSelection({ projectId, value });

  const connectionOptions = gscConnectionOptions(projectId);
  const connectionQuery = useQuery(connectionOptions);
  const connection = connectionQuery.data;
  const connected = Boolean(connection?.connected);
  const hasGrant = Boolean(connection?.currentUserHasGrant);
  const canManage = connection?.canManage === true;
  const selfHostedNeedsSetup =
    !hosted && connectionQuery.isSuccess && !connection?.googleOAuthConfigured;

  const showPicker = picking ?? (!connected && hasGrant && canManage);
  const sitesQuery = useQuery({
    queryKey: ["gscSites", projectId],
    queryFn: () => listGscSites({ data: { projectId } }),
    enabled: Boolean(showPicker && !selfHostedNeedsSetup),
  });
  const accounts = React.useMemo(
    () => sitesQuery.data?.accounts ?? [],
    [sitesQuery.data?.accounts],
  );
  const requiresReconnect = accounts.some(
    (account) => account.requiresReconnect,
  );

  React.useEffect(() => {
    if (!requiresReconnect) return;

    void queryClient.invalidateQueries({
      queryKey: ["gscConnection", projectId],
    });
    void queryClient.invalidateQueries({ queryKey: GRANT_STATUS_KEY });
  }, [requiresReconnect, queryClient, projectId]);

  React.useEffect(() => {
    if (!picking || !connected || selection) return;
    for (const account of accounts) {
      const selectedSite = account.sites.find((site) => site.isSelected);
      if (selectedSite) {
        setProjectSelection({
          projectId,
          value: {
            accountId: account.accountId,
            siteUrl: selectedSite.siteUrl,
          },
        });
        return;
      }
    }
  }, [accounts, selection, picking, connected, projectId]);

  const setSiteMutation = useMutation({
    mutationFn: ({
      projectId: targetProjectId,
      selected,
    }: {
      projectId: string;
      selected: GscSiteSelection;
    }) => setGscSite({ data: { projectId: targetProjectId, ...selected } }),
    onSuccess: (saved, { projectId: savedProjectId }) => {
      queryClient.setQueryData(
        gscConnectionOptions(savedProjectId).queryKey,
        (current: typeof connection) =>
          current ? { ...current, ...saved } : current,
      );
      captureClientEvent("gsc:property_select");
      toast.success("Search Console connected");
      queryClient.removeQueries({ queryKey: ["gscSites", savedProjectId] });
      void queryClient.invalidateQueries({
        queryKey: gscConnectionOptions(savedProjectId).queryKey,
      });
      if (currentProjectId.current === savedProjectId) setPicking(false);
      void queryClient.invalidateQueries({ queryKey: GRANT_STATUS_KEY });
      // The Search Performance report caches {connected:false}; refresh it so
      // the page shows data right after connecting instead of the stale card.
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformance", savedProjectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformanceTable", savedProjectId],
      });
      // The dashboard embeds this card and swaps it for the Search
      // performance stats card once activation reports the connection.
      void queryClient.invalidateQueries({
        queryKey: ["dashboardActivation", savedProjectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboardGscReport", savedProjectId],
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (targetProjectId: string) =>
      disconnectGsc({ data: { projectId: targetProjectId } }),
    onSuccess: (_, disconnectedProjectId) => {
      toast.success("Search Console disconnected from this project");
      queryClient.setQueryData(
        gscConnectionOptions(disconnectedProjectId).queryKey,
        (current: typeof connection) =>
          current ? { ...current, connected: false } : current,
      );
      queryClient.removeQueries({
        queryKey: ["gscSites", disconnectedProjectId],
      });
      if (currentProjectId.current === disconnectedProjectId) {
        setPicking(false);
        setSelection(null);
      }
      void queryClient.invalidateQueries({
        queryKey: gscConnectionOptions(disconnectedProjectId).queryKey,
      });
      void queryClient.invalidateQueries({ queryKey: GRANT_STATUS_KEY });
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformance", disconnectedProjectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["searchPerformanceTable", disconnectedProjectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboardActivation", disconnectedProjectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboardGscReport", disconnectedProjectId],
      });
    },
  });

  const handleConnect = () =>
    void linkAccount(returnTo ?? window.location.href);

  return (
    <IntegrationConnectionCard
      title="Google Search Console"
      icon={<GoogleSearchConsoleLogo className="size-5" />}
      status={
        connectionQuery.isPending || (connectionQuery.isError && !connection)
          ? undefined
          : selfHostedNeedsSetup
            ? "setup_required"
            : connected
              ? "connected"
              : "disconnected"
      }
    >
      <GoogleLinkErrorAlert provider="gsc" className="mb-4" />
      {connectionQuery.isPending ? (
        <div
          role="status"
          aria-label="Loading connection"
          className="space-y-3 animate-pulse"
        >
          <div className="h-4 w-2/3 rounded bg-base-200" />
          <div className="h-9 w-24 rounded bg-base-200" />
        </div>
      ) : connectionQuery.isError && !connection ? (
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
        <SelfHostedSetupWarning />
      ) : connected && !picking ? (
        <GoogleConnectedState
          property={connection?.siteUrl ?? ""}
          canManageAccounts={hasGrant}
          email={connection?.connectedByEmail}
          onChange={() => {
            setSiteMutation.reset();
            disconnectMutation.reset();
            setSelection(null);
            setPicking(true);
          }}
          onDisconnect={() => {
            setSiteMutation.reset();
            disconnectMutation.mutate(projectId);
          }}
          disconnecting={disconnectMutation.isPending}
          disabled={linking}
          canManage={canManage}
        />
      ) : showPicker ? (
        <fieldset disabled={linking || setSiteMutation.isPending}>
          <SitePicker
            key={projectId}
            readOnly={!canManage}
            linking={linking}
            loading={sitesQuery.isLoading}
            error={sitesQuery.isError}
            accounts={accounts}
            selection={selection}
            onSelect={setSelection}
            onSave={() =>
              selection &&
              setSiteMutation.mutate({ projectId, selected: selection })
            }
            saving={setSiteMutation.isPending}
            secondaryAction={{
              label: "Cancel",
              disabled: setSiteMutation.isPending,
              onClick: () => {
                setPicking(false);
                setSelection(null);
                setSiteMutation.reset();
              },
            }}
            onRetry={() => void sitesQuery.refetch()}
            onReconnect={handleConnect}
          />
        </fieldset>
      ) : (
        <GoogleProjectEmptyState
          name="Search Console"
          hasGrant={hasGrant}
          canManage={canManage}
          disabled={linking}
          onLink={handleConnect}
          onChoose={() => {
            setSiteMutation.reset();
            disconnectMutation.reset();
            setSelection(null);
            setPicking(true);
          }}
        ></GoogleProjectEmptyState>
      )}
      {setSiteMutation.isError || disconnectMutation.isError ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {getStandardErrorMessage(
            setSiteMutation.error ?? disconnectMutation.error,
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
  );
}
