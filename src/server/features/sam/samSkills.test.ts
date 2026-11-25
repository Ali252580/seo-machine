import { describe, expect, it } from "vitest";
import {
  buildArticleWritingSystemPrompt,
  buildSamSkillSource,
} from "@/server/features/sam/samSkills";

describe("buildSamSkillSource", () => {
  // Guards the real failure modes: a skill whose frontmatter breaks (build
  // throws), an internal repo-dev skill leaking into SAM, or the public set
  // silently shrinking because a glob or marking change dropped it.
  it("serves exactly the public product skills", async () => {
    const source = buildSamSkillSource();
    const names = (await source.list()).map((skill) => skill.name);

    expect(names).toEqual([
      "competitive-landscape",
      "competitor-analysis",
      "keyword-clustering",
      "keyword-research",
      "link-prospecting",
      "local-seo",
      "seo-audit",
      "seo-coach",
      "seo-project-setup",
    ]);

    const loaded = await source.load("seo-project-setup");
    expect(loaded?.body).toContain("Surface note: you are SAM");
  });
});

it("includes the complete editorial references and the project's context in the article prompt", async () => {
  const prompt = buildArticleWritingSystemPrompt("باغبانی روی بام");
  expect(prompt).toContain("باغبانی روی بام");
  for (const name of ["seo-audit", "keyword-research", "keyword-clustering"]) {
    const skill = await buildSamSkillSource().load(name);
    const body = skill?.body.match(/^# OpenSEO [\s\S]+/m)?.[0];
    expect(body).toBeTruthy();
    expect(prompt).toContain(`<skill name="${name}">\n${body}\n</skill>`);
  }
  expect(prompt).not.toContain("Surface note: you are SAM");
  expect(prompt).toContain("ONLY the requested article body in Persian HTML");
});
