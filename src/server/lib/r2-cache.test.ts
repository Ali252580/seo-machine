import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: {} }));

import { getCached, setCached } from "./r2-cache";

describe("r2-cache without an R2 binding", () => {
  it("falls through when running outside Cloudflare", async () => {
    await expect(getCached("missing")).resolves.toBeNull();
    await expect(setCached("missing", { ok: true }, 60)).resolves.toBeUndefined();
  });
});
