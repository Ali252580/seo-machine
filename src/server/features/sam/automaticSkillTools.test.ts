import { expect, it, vi } from "vitest";
import { tool } from "ai";
import { z } from "zod";
import { automaticSkillTools, boundedSkillArgs } from "./automaticSkillTools";
import { nextAutomaticSkill, type SkillRun } from "@/shared/automaticSkills";

it("limits batch costs and excludes writes and unrelated tools", () => {
  expect(
    boundedSkillArgs("research_keywords", {
      seeds: [1, 2, 3],
      includeClickstreamData: true,
      resultLimit: 500,
    }),
  ).toEqual({ seeds: [1], includeClickstreamData: false, resultLimit: 150 });
  expect(
    boundedSkillArgs("get_serp_results", { queries: [1, 2, 3, 4], depth: 100 }),
  ).toEqual({ queries: [1, 2, 3], depth: 10 });
  const base = tool({ inputSchema: z.object({}), execute: async () => "ok" });
  expect(
    Object.keys(
      automaticSkillTools(
        {
          read_pages: base,
          update_project_context: base,
          save_keywords: base,
          get_local_rank_grid: base,
        },
        "seo-project-setup",
        async () => {},
        [],
      ),
    ),
  ).toEqual(["read_pages"]);
});

it("checks credits before calls and caps even sequential calls at four", async () => {
  const execute = vi.fn(async () => "ok");
  const before = vi.fn(async () => {});
  const used: string[] = [];
  const tools = automaticSkillTools(
    { read_pages: tool({ inputSchema: z.object({}), execute }) },
    "seo-project-setup",
    before,
    used,
  );
  for (let i = 0; i < 6; i++)
    await tools.read_pages.execute!(
      {},
      { toolCallId: String(i), messages: [] },
    );
  expect(execute).toHaveBeenCalledTimes(4);
  expect(before).toHaveBeenCalledTimes(4);
  expect(used).toHaveLength(4);
});

it("does not execute tools when access or credits are unavailable", async () => {
  const execute = vi.fn(async () => "ok");
  const tools = automaticSkillTools(
    { read_pages: tool({ inputSchema: z.object({}), execute }) },
    "seo-project-setup",
    async () => {
      throw new Error("disabled");
    },
    [],
  );
  await expect(
    tools.read_pages.execute!({}, { toolCallId: "1", messages: [] }),
  ).rejects.toThrow("disabled");
  expect(execute).not.toHaveBeenCalled();
});

it("runs missing skills first and reuses reviewed results for thirty days", async () => {
  const { automaticSkills } = await import("@/shared/automaticSkills");
  const now = Date.parse("2026-11-09T00:00:00Z");
  const runs: SkillRun[] = automaticSkills.map(({ name }) => ({
    name,
    status: "reviewed",
    report: "result",
    tools: [],
    updatedAt: new Date(now - 10 * 86400000).toISOString(),
  }));
  expect(nextAutomaticSkill([], now)?.name).toBe("seo-project-setup");
  expect(nextAutomaticSkill(runs, now)).toBeUndefined();
  runs[2].status = "partial";
  expect(nextAutomaticSkill(runs, now)?.name).toBe("seo-audit");
  expect(nextAutomaticSkill(runs.slice(0, 8), now)?.name).toBe("local-seo");
});
