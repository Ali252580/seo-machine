import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { samSessions } from "@/db/schema";

type CreateSamSessionInput = {
  projectId: string;
  userId: string;
};

async function createSession(input: CreateSamSessionInput) {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(samSessions)
    .values({
      id,
      projectId: input.projectId,
      userId: input.userId,
    })
    .returning();
  return row;
}

// Callers must have already authorized the project (requireProjectContext).
// Scoped to userId so a project member only sees their own sessions.
async function listSessionsForProject(projectId: string, userId: string) {
  return db
    .select({
      id: samSessions.id,
      title: samSessions.title,
      createdAt: samSessions.createdAt,
      updatedAt: samSessions.updatedAt,
    })
    .from(samSessions)
    .where(
      and(
        eq(samSessions.projectId, projectId),
        eq(samSessions.userId, userId),
        isNull(samSessions.archivedAt),
      ),
    )
    .orderBy(desc(samSessions.updatedAt), desc(samSessions.id));
}

// Look up a session by id alone (no scoping). Only for the SamChatAgent
// Durable Object, whose connections are authorized in the Worker before they
// reach the DO; the DO derives its project/user (and, via the project, its
// org) from this row.
async function getSessionById(id: string) {
  const [row] = await db
    .select()
    .from(samSessions)
    .where(eq(samSessions.id, id))
    .limit(1);
  return row ?? null;
}

// Look up a caller's own active session by id, scoped to userId so one org
// member can't act on another's session. Excludes archived sessions so callers
// treat them like deleted ones (connection refused / not archivable) even
// though the row and DO transcript are kept. Callers must still check access to
// row.projectId via the canonical project-access path
// (ProjectRepository.getProjectForOrganization) before acting on the session.
async function getActiveSession(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(samSessions)
    .where(
      and(
        eq(samSessions.id, id),
        eq(samSessions.userId, userId),
        isNull(samSessions.archivedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

// Set the title from the first user message and bump updatedAt so the session
// sorts to the top of the side-panel. Called by the DO on the first turn.
async function setTitle(id: string, title: string) {
  await db
    .update(samSessions)
    .set({ title, updatedAt: new Date().toISOString() })
    .where(eq(samSessions.id, id));
}

async function touch(id: string) {
  await db
    .update(samSessions)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(samSessions.id, id));
}

// Callers must have already authorized the session's project.
async function archiveSession(id: string) {
  await db
    .update(samSessions)
    .set({ archivedAt: new Date().toISOString() })
    .where(eq(samSessions.id, id));
}

// Atomic claim for the Vercel request/response transport. A function killed
// mid-turn leaves a claim; it expires after two minutes so the user can retry.
async function claimTurn(id: string, userId: string, turnId: string) {
  const staleBefore = new Date(Date.now() - 120_000).toISOString();
  const [claimed] = await db
    .update(samSessions)
    .set({ activeTurnId: turnId, activeTurnAt: new Date().toISOString() })
    .where(
      and(
        eq(samSessions.id, id),
        eq(samSessions.userId, userId),
        isNull(samSessions.archivedAt),
        or(
          isNull(samSessions.activeTurnId),
          lt(samSessions.activeTurnAt, staleBefore),
        ),
      ),
    )
    .returning({ id: samSessions.id });
  return Boolean(claimed);
}

async function releaseTurn(id: string, turnId: string) {
  await db
    .update(samSessions)
    .set({ activeTurnId: null, activeTurnAt: null })
    .where(and(eq(samSessions.id, id), eq(samSessions.activeTurnId, turnId)));
}

export const SamSessionRepository = {
  createSession,
  listSessionsForProject,
  getSessionById,
  getActiveSession,
  setTitle,
  touch,
  archiveSession,
  claimTurn,
  releaseTurn,
} as const;
