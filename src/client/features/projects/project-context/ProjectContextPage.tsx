import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { PROSE_MAX_CHARS } from "@/types/schemas/projectContext";
import {
  getProjectContext,
  initializeProjectContext,
} from "@/serverFunctions/projectContext";
import { CompetitorsSection } from "./CompetitorsSection";
import { ProseSections } from "./ProseSections";
import { KeyPagesSection } from "./KeyPagesSection";
import {
  ConfirmDeleteButton,
  EmptyState,
  FormActions,
  listClass,
  Provenance,
  RowActions,
  SectionHeader,
  projectContextQueryKey,
  useContextUpdate,
  type ProjectContextData,
} from "./shared";

export function ProjectContextPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const attempted = React.useRef(new Set<string>());
  const contextQuery = useQuery({
    queryKey: projectContextQueryKey(projectId),
    queryFn: () => getProjectContext({ data: { projectId } }),
    // This page exists to inspect what agents just wrote; the app-wide
    // 5-minute staleTime would show pre-SAM-turn memory as current.
    staleTime: 0,
  });
  const {
    mutate: initializeContext,
    isPending: initializationPending,
    isError: initializationError,
    error: initializationFailure,
  } = useMutation({
    mutationFn: (targetProjectId: string) =>
      initializeProjectContext({ data: { projectId: targetProjectId } }),
    onSuccess: (context, targetProjectId) =>
      queryClient.setQueryData(
        projectContextQueryKey(targetProjectId),
        context,
      ),
  });

  React.useEffect(() => {
    if (
      !contextQuery.data?.missingSections.length ||
      attempted.current.has(projectId)
    )
      return;
    attempted.current.add(projectId);
    initializeContext(projectId);
  }, [projectId, contextQuery.data?.missingSections.length, initializeContext]);

  if (contextQuery.isPending) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (contextQuery.isError) {
    return (
      <div className="alert alert-error">
        <span className="text-sm">
          {getStandardErrorMessage(
            contextQuery.error,
            "Failed to load project context",
          )}
        </span>
      </div>
    );
  }

  const context = contextQuery.data;

  return (
    // key remounts the whole page when the project switches under it, so no
    // draft, open form, or edit state can carry over to another project.
    <div key={projectId} className="space-y-8">
      <div className="space-y-3 rounded-lg border border-base-300 bg-base-200/40 p-4 text-sm">
        <p>
          این اطلاعات فقط برای همین پروژه ذخیره می‌شود و SAM هنگام کار از آن
          استفاده می‌کند. خانه‌های خالی به‌طور خودکار از سایت همین پروژه پر
          می‌شوند. موارد استنباطی با عنوان «پیش‌نویس» مشخص‌اند.
        </p>
        {initializationPending ? (
          <p>در حال خواندن سایت و آماده‌کردن پیش‌نویس…</p>
        ) : null}
        {initializationError ? (
          <p className="text-error">
            خواندن سایت ناموفق بود: {getStandardErrorMessage(initializationFailure)}
          </p>
        ) : null}
        {context.missingSections.length > 0 && !initializationPending ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => initializeContext(projectId)}
          >
            تلاش دوباره برای تکمیل از سایت
          </button>
        ) : null}
      </div>

      <ProseSections
        projectId={projectId}
        sections={context.sections}
        missingSections={context.missingSections}
      />

      <CompetitorsSection
        projectId={projectId}
        competitors={context.competitors}
      />

      <KeyPagesSection projectId={projectId} keyPages={context.keyPages} />

      <CustomSections
        projectId={projectId}
        customSections={context.customSections}
      />

      <ResearchLog projectId={projectId} researchLog={context.researchLog} />
    </div>
  );
}

function CustomSections({
  projectId,
  customSections,
}: {
  projectId: string;
  customSections: ProjectContextData["customSections"];
}) {
  const update = useContextUpdate(projectId);
  const [editingSlug, setEditingSlug] = React.useState<string | null>(null);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="بخش‌های تکمیلی"
        hint="اطلاعات پایداری که در بخش‌های بالا جای نمی‌گیرند."
      />

      {customSections.length === 0 ? (
        <EmptyState>
          هنوز بخش تکمیلی برای این پروژه ثبت نشده است. SAM در صورت نیاز می‌تواند
          آن را اضافه کند.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {customSections.map((custom) =>
            editingSlug === custom.slug ? (
              <CustomSectionForm
                key={custom.slug}
                custom={custom}
                pending={update.isPending}
                onCancel={() => setEditingSlug(null)}
                onSave={(title, content) =>
                  update.mutate(
                    [{ customSection: custom.slug, title, content }],
                    { onSuccess: () => setEditingSlug(null) },
                  )
                }
              />
            ) : (
              <div
                key={custom.slug}
                className="space-y-2 rounded-lg border border-base-300 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">
                      {custom.title ?? custom.slug}
                    </h3>
                    <Provenance by={custom.updatedBy} at={custom.updatedAt} />
                  </div>
                  <RowActions>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      aria-label={`Edit ${custom.title ?? custom.slug}`}
                      onClick={() => setEditingSlug(custom.slug)}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <ConfirmDeleteButton
                      label={`Delete ${custom.title ?? custom.slug}`}
                      pending={update.isPending}
                      onConfirm={() =>
                        update.mutate([{ deleteCustomSection: custom.slug }])
                      }
                    />
                  </RowActions>
                </div>
                <p className="whitespace-pre-wrap text-sm text-base-content/70">
                  {custom.content}
                </p>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function CustomSectionForm({
  custom,
  pending,
  onCancel,
  onSave,
}: {
  custom: ProjectContextData["customSections"][number];
  pending: boolean;
  onCancel: () => void;
  onSave: (title: string, content: string) => void;
}) {
  const [title, setTitle] = React.useState(custom.title ?? "");
  const [content, setContent] = React.useState(custom.content);

  return (
    <form
      className="space-y-2 rounded-lg border border-base-300 bg-base-200/40 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || !content.trim()) return;
        onSave(title.trim() || custom.slug, content);
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={custom.slug}
        maxLength={120}
        className="input input-bordered input-sm w-full"
        aria-label="عنوان بخش"
      />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={5}
        maxLength={PROSE_MAX_CHARS}
        className="textarea textarea-bordered w-full text-sm"
        aria-label="محتوای بخش"
      />
      <FormActions
        pending={pending}
        disabled={!content.trim()}
        onCancel={onCancel}
      />
    </form>
  );
}

function ResearchLog({
  projectId,
  researchLog,
}: {
  projectId: string;
  researchLog: ProjectContextData["researchLog"];
}) {
  const update = useContextUpdate(projectId);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="سابقهٔ پژوهش"
        hint="پژوهش‌های ثبت‌شده برای جلوگیری از خرید دوبارهٔ همان داده."
      />

      {researchLog.length === 0 ? (
        <EmptyState>
          هنوز پژوهشی ثبت نشده است. عامل‌ها هنگام اجرای پژوهشِ هزینه‌دار، آن را
          اینجا ثبت می‌کنند.
        </EmptyState>
      ) : (
        <ul className={listClass}>
          {researchLog.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 p-3"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm text-base-content/80">{entry.summary}</p>
                <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-base-content/40">
                  <span>{entry.entryDate}</span>
                  <Provenance by={entry.createdBy} />
                </div>
              </div>
              <RowActions>
                <ConfirmDeleteButton
                  label={`Delete log entry from ${entry.entryDate}`}
                  pending={update.isPending}
                  onConfirm={() =>
                    update.mutate([{ removeResearchLog: [entry.id] }])
                  }
                />
              </RowActions>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
