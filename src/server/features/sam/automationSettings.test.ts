import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type * as AutomationSettings from "./automationSettings";

vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
let client: Client;
let settings: typeof AutomationSettings;
beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  const testDb = drizzle(client);
  vi.doMock("@/db", () => ({ db: testDb }));
  await client.execute(`CREATE TABLE project_context_sections (
    project_id TEXT NOT NULL, key TEXT NOT NULL, title TEXT, content TEXT NOT NULL,
    updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, PRIMARY KEY(project_id, key)
  )`);
  settings = await import("./automationSettings");
});
afterAll(() => client.close());

it("keeps paid skill consent separate from weekly recommendations", async () => {
  await settings.setAutomationEnabled(
    "skills",
    true,
    settings.SKILL_AUTOMATION_KEY,
  );
  expect(await settings.getAutomationEnabled("skills")).toBe(false);
  expect(
    await settings.getAutomationEnabled(
      "skills",
      settings.SKILL_AUTOMATION_KEY,
    ),
  ).toBe(true);
  expect(
    await settings.enabledAutomationProjects(settings.SKILL_AUTOMATION_KEY),
  ).toEqual([{ id: "skills" }]);
});

it("defaults off, isolates project opt-ins, and removes disabled projects from the scheduler selection", async () => {
  expect(await settings.getAutomationEnabled("a")).toBe(false);
  expect(await settings.enabledAutomationProjects()).toEqual([]);
  await settings.setAutomationEnabled("a", true);
  expect(await settings.getAutomationEnabled("a")).toBe(true);
  expect(await settings.getAutomationEnabled("b")).toBe(false);
  expect(await settings.enabledAutomationProjects()).toEqual([{ id: "a" }]);
  await settings.setAutomationEnabled("b", true);
  await settings.setAutomationEnabled("a", false);
  expect(await settings.getAutomationEnabled("a")).toBe(false);
  expect(await settings.enabledAutomationProjects()).toEqual([{ id: "b" }]);
});
