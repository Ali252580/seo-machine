import { sql } from "drizzle-orm";
import { pgDb } from "@/db/pg/client";

// The OAuth provider uses only KV's get/put/delete/list methods. Keep its
// grants and refresh tokens in the Vercel deployment's existing PostgreSQL.
export const vercelOAuthKv = {
  async get(key: string, options?: { type?: string }) {
    const rows = await pgDb.execute<{ value: string }>(sql`
      SELECT "value" FROM mcp_oauth_kv
      WHERE "key" = ${key} AND ("expires_at" IS NULL OR "expires_at" > ${Date.now()})
    `);
    const value = rows[0]?.value ?? null;
    return options?.type === "json" && value !== null
      ? JSON.parse(value)
      : value;
  },

  async put(
    key: string,
    value: string,
    options?: { expiration?: number; expirationTtl?: number },
  ) {
    const expiresAt = options?.expiration
      ? options.expiration * 1000
      : options?.expirationTtl
        ? Date.now() + options.expirationTtl * 1000
        : null;
    await pgDb.execute(sql`
      INSERT INTO mcp_oauth_kv ("key", "value", "expires_at")
      VALUES (${key}, ${value}, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value",
        "expires_at" = EXCLUDED."expires_at"
    `);
  },

  async delete(key: string) {
    await pgDb.execute(sql`DELETE FROM mcp_oauth_kv WHERE "key" = ${key}`);
  },

  async list(options?: {
    prefix?: string | null;
    cursor?: string | null;
    limit?: number;
  }) {
    const prefix = options?.prefix ?? "";
    const cursor = options?.cursor ?? "";
    const limit = Math.max(1, Math.min(options?.limit ?? 1000, 1000));
    const rows = await pgDb.execute<{ key: string }>(sql`
      SELECT "key" FROM mcp_oauth_kv
      WHERE left("key", length(${prefix})) = ${prefix}
        AND "key" > ${cursor}
        AND ("expires_at" IS NULL OR "expires_at" > ${Date.now()})
      ORDER BY "key" LIMIT ${limit + 1}
    `);
    const keys = rows.slice(0, limit).map(({ key }) => ({ name: key }));
    if (rows.length <= limit)
      return { keys, list_complete: true as const, cacheStatus: null };
    return {
      keys,
      list_complete: false as const,
      cursor: keys.at(-1)!.name,
      cacheStatus: null,
    };
  },
};
