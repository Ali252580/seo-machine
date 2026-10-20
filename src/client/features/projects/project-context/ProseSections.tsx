import * as React from "react";
import {
  PROJECT_CONTEXT_SECTION_KEYS,
  PROSE_MAX_CHARS,
  type ProjectContextSectionKey,
} from "@/types/schemas/projectContext";
import {
  EmptyState,
  Provenance,
  useContextUpdate,
  type ProjectContextData,
} from "./shared";

const SECTION_HINTS: Record<ProjectContextSectionKey, string> = {
  business_overview: "خدمات یا محصولات، مخاطبان و محدودهٔ فعالیت سایت.",
  current_goal: "هدف فعلی سئو، شاخص موفقیت و بازهٔ زمانی آن.",
  positioning: "دلیل انتخاب شما در مقایسه با گزینه‌های دیگر.",
  writing_preferences:
    "لحن متن، واژه‌های نامطلوب و موضوعاتی که نباید پوشش داده شوند.",
};

const SECTION_LABELS: Record<ProjectContextSectionKey, string> = {
  business_overview: "معرفی کسب‌وکار",
  current_goal: "هدف فعلی",
  positioning: "جایگاه و مزیت برند",
  writing_preferences: "ترجیحات نگارش",
};

const SECTION_PLACEHOLDERS: Record<ProjectContextSectionKey, string> = {
  business_overview:
    "مثلاً خدمات اصلی، مشتریان هدف، شهرها و زبان‌های موردنظر را بنویسید.",
  current_goal: "مثلاً افزایش سرنخ‌های ارگانیک خدمات اصلی در شش ماه آینده.",
  positioning:
    "مثلاً مزیت‌های قابل اثبات، تفاوت خدمات و دلیل انتخاب مشتری را بنویسید.",
  writing_preferences:
    "مثلاً فارسی روان و حرفه‌ای؛ بدون ادعای بی‌منبع یا تکرار؛ واژه‌ها و موضوعات ممنوع را مشخص کنید.",
};

export function ProseSections({
  projectId,
  sections,
  missingSections,
}: {
  projectId: string;
  sections: ProjectContextData["sections"];
  missingSections: ProjectContextData["missingSections"];
}) {
  const update = useContextUpdate(projectId);
  const stored = new Map(sections.map((section) => [section.key, section]));
  // Only the fields the user actually touched are pinned locally; the rest
  // render straight from the query, so a write from SAM shows up on refetch.
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const draftOf = (key: ProjectContextSectionKey) =>
    drafts[key] ?? stored.get(key)?.content ?? "";

  // Content is trimmed server-side, so compare trimmed values — otherwise a
  // stray newline leaves the form permanently "unsaved".
  const changed = PROJECT_CONTEXT_SECTION_KEYS.filter(
    (key) => draftOf(key).trim() !== (stored.get(key)?.content ?? ""),
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (update.isPending || changed.length === 0) return;
    update.mutate(
      changed.map((key) => ({ section: key, content: draftOf(key).trim() })),
      // Unpin every draft the save made redundant — one that now matches the
      // server — so those sections render from the query again (a pinned
      // draft would silently overwrite a later agent write on the next
      // save). Anything typed while the request was in flight still differs
      // and stays pinned instead of snapping back.
      {
        onSuccess: (context) => {
          const saved = new Map<string, string>(
            context.sections.map((section) => [section.key, section.content]),
          );
          setDrafts((current) =>
            Object.fromEntries(
              Object.entries(current).filter(
                ([key, value]) => value.trim() !== (saved.get(key) ?? ""),
              ),
            ),
          );
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {missingSections.length === PROJECT_CONTEXT_SECTION_KEYS.length ? (
        <EmptyState>
          هنوز برای این پروژه زمینه‌ای ثبت نشده است. اطلاعاتی را که می‌دانید
          بنویسید؛ برای موارد قابل بررسی نیز از SAM کمک بگیرید و نتیجه را تأیید
          کنید.
        </EmptyState>
      ) : null}

      {PROJECT_CONTEXT_SECTION_KEYS.map((key) => {
        const section = stored.get(key);
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <label
                htmlFor={`context-${key}`}
                className="text-sm font-medium text-base-content"
              >
                {SECTION_LABELS[key]}
              </label>
              {section ? (
                <Provenance by={section.updatedBy} at={section.updatedAt} />
              ) : (
                <span className="text-xs text-base-content/40">
                  هنوز ثبت نشده
                </span>
              )}
            </div>
            <p className="text-xs text-base-content/50">{SECTION_HINTS[key]}</p>
            <textarea
              id={`context-${key}`}
              value={draftOf(key)}
              onChange={(event) => {
                const value = event.target.value;
                setDrafts((current) => {
                  // A draft that matches the store is no draft at all — drop
                  // it so an edit typed and then undone doesn't pin the
                  // section against later agent writes.
                  if (value === (stored.get(key)?.content ?? "")) {
                    const { [key]: _dropped, ...rest } = current;
                    return rest;
                  }
                  return { ...current, [key]: value };
                });
              }}
              rows={4}
              maxLength={PROSE_MAX_CHARS}
              placeholder={SECTION_PLACEHOLDERS[key]}
              className="textarea textarea-bordered w-full text-sm"
            />
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={update.isPending || changed.length === 0}
        >
          ذخیرهٔ تغییرات
        </button>
      </div>
    </form>
  );
}
