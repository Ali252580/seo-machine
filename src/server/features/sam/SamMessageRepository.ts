import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { samMessages } from "@/db/schema";

// Vercel has no Durable Object transcript. Keep its messages in the same
// database as sam_sessions so existing session ownership remains authoritative.
async function list(sessionId: string, limit = 50) {
  const rows = await db
    .select()
    .from(samMessages)
    .where(eq(samMessages.sessionId, sessionId))
    .orderBy(desc(samMessages.createdAt), desc(samMessages.id))
    .limit(limit);
  const oldestFirst: typeof rows = [];
  for (let index = rows.length - 1; index >= 0; index--) {
    oldestFirst.push(rows[index]);
  }
  return oldestFirst;
}

async function append(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
) {
  const [row] = await db
    .insert(samMessages)
    .values({ id: crypto.randomUUID(), sessionId, role, content })
    .returning();
  return row;
}

export const SamMessageRepository = { list, append } as const;
