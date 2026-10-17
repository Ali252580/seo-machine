import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account } from "@/db/schema";
import { AppError } from "@/server/lib/errors";
import { createGa4AdminClient } from "@/server/lib/ga4Client";
import { Ga4AdminApiError, Ga4TokenError } from "@/server/lib/ga4Errors";
import { GA4_OAUTH_PROVIDER_ID } from "@/shared/ga4";
import { ga4StreamsMatchProjectDomain } from "@/server/features/ga4/ga4ProjectProperty";
import {
  Ga4ConnectionRepository,
  type Ga4Connection,
} from "@/server/features/ga4/repositories/Ga4ConnectionRepository";

async function getConnection(projectId: string): Promise<Ga4Connection | null> {
  return Ga4ConnectionRepository.getByProjectId(projectId);
}

async function listGrantsForUser(userId: string) {
  return db
    .select({ id: account.id, accountId: account.accountId })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, GA4_OAUTH_PROVIDER_ID),
      ),
    );
}

async function userHasGrant(userId: string): Promise<boolean> {
  const grants = await listGrantsForUser(userId);
  return grants.length > 0;
}

function requiresReconnect(error: unknown): boolean {
  return (
    error instanceof Ga4TokenError ||
    (error instanceof Ga4AdminApiError && error.status === 401)
  );
}

async function listPropertiesForUserWithGrantStatus(
  userId: string,
  projectDomain: string | null,
) {
  const grants = await listGrantsForUser(userId);
  const accounts = await Promise.all(
    grants.map(async (grant) => {
      const client = createGa4AdminClient({
        userId,
        ga4AccountId: grant.accountId,
      });
      try {
        const availableProperties = await client.listProperties();
        const properties = (
          await Promise.all(
            availableProperties.map(async (property) => ({
              property,
              matches: ga4StreamsMatchProjectDomain(
                await client.listDataStreams(property.propertyId),
                projectDomain,
              ),
            })),
          )
        )
          .filter(({ matches }) => matches)
          .map(({ property }) => property);
        let email: string | null = null;
        try {
          email = await client.getUserInfoEmail();
        } catch {
          email = null;
        }
        return {
          accountId: grant.accountId,
          email,
          requiresReconnect: false,
          propertiesUnavailable: false,
          propertiesError: null,
          properties,
        };
      } catch (error) {
        const reconnect = requiresReconnect(error);
        if (!reconnect) {
          console.error("ga4.property_discovery_failed", {
            errorName: error instanceof Error ? error.name : "UnknownError",
            status:
              error instanceof Ga4AdminApiError ? error.status : undefined,
          });
        }
        return {
          accountId: grant.accountId,
          email: null,
          requiresReconnect: reconnect,
          propertiesUnavailable: !reconnect,
          propertiesError: reconnect
            ? null
            : error instanceof Ga4AdminApiError
              ? error.message
              : "Google Analytics could not load properties. Check the Admin API and try again.",
          properties: [],
        };
      }
    }),
  );
  return { accounts };
}

async function setProperty(input: {
  projectId: string;
  projectDomain: string | null;
  organizationId: string;
  propertyId: string;
  accountId: string;
  userId: string;
}): Promise<Ga4Connection> {
  const grants = await listGrantsForUser(input.userId);
  if (!grants.some((grant) => grant.accountId === input.accountId)) {
    throw new AppError(
      "NOT_FOUND",
      "That Google account isn't connected to your OpenSEO account.",
    );
  }

  const client = createGa4AdminClient({
    userId: input.userId,
    ga4AccountId: input.accountId,
  });
  const properties = await client.listProperties();
  if (
    !properties.some((property) => property.propertyId === input.propertyId)
  ) {
    throw new AppError(
      "NOT_FOUND",
      "That Google Analytics property isn't available on your connected Google account.",
    );
  }

  const property = await client.getProperty(input.propertyId);
  if (
    !ga4StreamsMatchProjectDomain(
      await client.listDataStreams(input.propertyId),
      input.projectDomain,
    )
  ) {
    throw new AppError(
      "FORBIDDEN",
      "That Google Analytics property does not exclusively match this project domain.",
    );
  }
  let connectedAccountEmail: string | null = null;
  try {
    connectedAccountEmail = await client.getUserInfoEmail();
  } catch {
    connectedAccountEmail = null;
  }

  return Ga4ConnectionRepository.upsert({
    projectId: input.projectId,
    organizationId: input.organizationId,
    propertyId: property.name,
    propertyDisplayName: property.displayName,
    propertyTimeZone: property.timeZone,
    propertyCurrencyCode: property.currencyCode,
    connectedByUserId: input.userId,
    ga4AccountId: input.accountId,
    connectedAccountEmail,
  });
}

async function disconnect(input: { projectId: string }): Promise<void> {
  await Ga4ConnectionRepository.deleteByProjectId(input.projectId);
}

export const Ga4Service = {
  getConnection,
  userHasGrant,
  listPropertiesForUserWithGrantStatus,
  setProperty,
  disconnect,
};
