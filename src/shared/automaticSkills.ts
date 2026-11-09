import { z } from "zod";
import { sort } from "remeda";

export const automaticSkills = [
  { name: "seo-project-setup", title: "تکمیل شناخت پروژه" },
  { name: "seo-coach", title: "وضعیت سایت و گام بعدی" },
  { name: "seo-audit", title: "بررسی مشکلات سایت" },
  { name: "keyword-research", title: "فرصت‌های کلمات کلیدی" },
  { name: "keyword-clustering", title: "گروه‌بندی کلمات و صفحات هدف" },
  { name: "competitive-landscape", title: "بررسی رقبای بازار" },
  { name: "competitor-analysis", title: "تحلیل رقیب ثبت‌شده" },
  { name: "link-prospecting", title: "فرصت‌های دریافت لینک" },
  { name: "local-seo", title: "بررسی سئوی محلی" },
] as const;
export type AutomaticSkill = (typeof automaticSkills)[number]["name"];
export const skillReportSchema = z.object({
  status: z.enum(["reviewed", "partial", "needs_input"]),
  report: z.string().min(1).max(12000),
});
export const skillRunSchema = skillReportSchema.extend({
  name: z.enum(automaticSkills.map((skill) => skill.name)),
  status: z.enum(["reviewed", "partial", "needs_input", "error"]),
  updatedAt: z.string().datetime(),
  tools: z.array(z.string()).max(4),
});
export const skillRunsSchema = z.array(skillRunSchema).max(9);
export type SkillRun = z.infer<typeof skillRunSchema>;

export function nextAutomaticSkill(runs: SkillRun[], now = Date.now()) {
  return (
    automaticSkills.find(
      (skill) => !runs.some((run) => run.name === skill.name),
    ) ??
    sort(
      automaticSkills
        .map((skill) => ({
          skill,
          run: runs.find((run) => run.name === skill.name)!,
        }))
        .filter(
          ({ run }) =>
            now - Date.parse(run.updatedAt) >=
            (run.status === "reviewed" ? 30 : 7) * 86400000,
        ),
      (a, b) => Date.parse(a.run.updatedAt) - Date.parse(b.run.updatedAt),
    )[0]?.skill
  );
}
