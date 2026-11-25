import { sort } from "remeda";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { SkillSource } from "agents/skills";

// Bundle the repo's public-facing skills (.agents/skills) into SAM at build
// time. Skills marked `metadata.internal: true` are repo-dev tooling and stay
// out. The glob names the dot-directory literally, so Vite matches it.
//
// The source implements the `SkillSource` interface by hand (type-only import
// above): the `agents/skills` runtime module drags in the skill-*script*
// executor graph (@cloudflare/codemode, just-bash), which a static in-memory
// manifest doesn't need.
const skillFiles = import.meta.glob<string>("/.agents/skills/*/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

// The skill bodies are written for external MCP clients (Claude Code); this
// note reframes the surface so SAM skips the steps that don't apply in-app.
const SAM_SURFACE_NOTE = `> Surface note: you are SAM, running inside the OpenSEO app. You are already
> authenticated and scoped to the user's current project — skip any "verify the
> MCP connection", "choose a project", or skill-install steps. You have no
> local filesystem: skip local-folder and file steps.
>
> Your project context is already in your system prompt — read it there; there
> is no get_project_context tool here. Write durable facts about the business
> back with update_project_context. You have no report tools: skip any step
> that says to deliver through the seo-report skill or to save a report, and
> give the findings in chat, short and scannable.
> If a skill step needs a tool you don't have (e.g. project creation), say so
> and point the user at the app page rather than improvising.`;

type SamSkill = { name: string; description: string; body: string };

const frontmatterSchema = z.looseObject({
  name: z.string().min(1),
  description: z.string().min(1),
  metadata: z.looseObject({ internal: z.boolean().optional() }).optional(),
});

function parseSkill(path: string, raw: string): SamSkill | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`Skill has no frontmatter: ${path}`);
  const parsed = frontmatterSchema.safeParse(parseYaml(match[1]));
  if (!parsed.success) {
    throw new Error(`Skill frontmatter needs name + description: ${path}`);
  }
  const frontmatter = parsed.data;
  if (frontmatter.metadata?.internal === true) return null;
  // Public for `npx skills add` users but not an in-app workflow: it drafts
  // GitHub issues for contributors, which SAM has no surface for.
  if (frontmatter.name === "simple-issue-description") return null;
  // SAM has no report tools, so the report-writing skill has nothing to drive.
  if (frontmatter.name === "seo-report") return null;
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    body: match[2].trim(),
  };
}

// Content hash so Think's registry refreshes the catalog when a deploy ships
// changed skills (djb2 — stability matters here, not collision resistance).
function fingerprint(skills: SamSkill[]): string {
  let hash = 5381;
  for (const ch of skills.map((s) => `${s.name}\n${s.body}`).join("\n")) {
    hash = ((hash * 33) ^ ch.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16);
}

// The bundled skills are fixed per deploy, so parse and hash them once per
// isolate instead of on every getSkills() call.
let cachedSkills: SamSkill[] | undefined;
function bundledSkills(): SamSkill[] {
  return (cachedSkills ??= sort(
    Object.entries(skillFiles)
      .map(([path, raw]) => parseSkill(path, raw))
      .filter((skill): skill is SamSkill => skill !== null),
    (a, b) => a.name.localeCompare(b.name),
  ));
}

export function buildArticleWritingSystemPrompt(memory: string): string {
  const skills = bundledSkills();
  const references = [
    "keyword-research",
    "keyword-clustering",
    "seo-audit",
  ].map((name) => {
    const skill = skills.find((item) => item.name === name);
    if (!skill) throw new Error(`Missing article writing skill: ${name}`);
    return `<skill name="${name}">\n${skill.body}\n</skill>`;
  });
  return [
    "Write natural Persian using the research and writing profile supplied by the application. For an educational article, answer the main question in the opening and use a concrete example to explain a decision or step. For a service page, lead with the reader's need and explain the scope and next step using verified business details. Give each heading a distinct purpose. Omit generic introductions, repeated keyword variants and conclusions that simply repeat the opening. Treat excerpts as sources. Omit unsupported claims, including prices, guarantees and invented client stories. Deliver the article directly without intake questions, plans or tool calls.",
    memory ? `project_context:\n${memory}` : "",
    "Use the following SEO references when composing and reviewing the draft. The application supplies the research and handles site coverage checks. Apply only editorial steps to the supplied evidence: identify the reader's intent, group related questions on this page, and verify claims and internal link targets. Omit unsupported details. Skip the references' tool calls, intake, report templates, and persistence steps. Return only the article HTML.",
    ...references,
    "For this turn, write ONLY the requested article body in Persian HTML. Use h2, h3, p, ul, ol, li, strong, em, br tags with no attributes. For verified relevant published pages on the active project's domain, also allow a tags with only a double-quoted absolute http(s) href, without credentials or other attributes. Never invent link URLs or link to drafts. No markdown fences, preface, invented facts, or claims of first-hand experience. Write for the stated search intent and the active project's market. This is an editable in-app draft, not a published page.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

let cachedSource: SkillSource | undefined;
export function buildSamSkillSource(): SkillSource {
  if (cachedSource) return cachedSource;
  const skills = bundledSkills().map((skill) => ({
    ...skill,
    body: `${SAM_SURFACE_NOTE}\n\n${skill.body}`,
  }));

  return (cachedSource = {
    id: "openseo-public-skills",
    fingerprint: fingerprint(skills),
    list: () =>
      Promise.resolve(
        skills.map(({ name, description }) => ({ name, description })),
      ),
    load: (name) =>
      Promise.resolve(skills.find((skill) => skill.name === name) ?? null),
  });
}
