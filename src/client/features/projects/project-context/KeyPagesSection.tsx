import * as React from "react";
import { ArrowUpLeft, FileText, Pencil, Plus } from "lucide-react";
import {
  KEY_PAGE_ROLES,
  type KeyPageRole,
  type ProjectContextUpdate,
} from "@/types/schemas/projectContext";
import {
  ConfirmDeleteButton,
  EmptyState,
  FormActions,
  listClass,
  Provenance,
  RowActions,
  SectionHeader,
  useContextUpdate,
  type ContextKeyPage,
} from "./shared";

import { keyPagePath } from "./keyPageUrlKey";

const ROLE_LABELS: Record<KeyPageRole, string> = {
  hub: "صفحهٔ اصلی موضوع",
  spoke: "صفحهٔ پشتیبان",
  money: "صفحهٔ خدمات یا محصول",
  other: "سایر",
};

export function KeyPagesSection({
  projectId,
  keyPages,
  editingId,
  onEditingIdChange,
}: {
  projectId: string;
  keyPages: ContextKeyPage[];
  editingId: string | null;
  onEditingIdChange: (id: string | null) => void;
}) {
  const update = useContextUpdate(projectId);
  const [adding, setAdding] = React.useState(false);

  const save = (previousUrl: string | null, draft: KeyPageDraft) => {
    const ops: ProjectContextUpdate[] = [];
    // Key pages upsert by URL, so a retyped URL has to drop the old row before
    // the new one lands.
    if (previousUrl && previousUrl !== draft.url.trim()) {
      ops.push({ removeKeyPages: [previousUrl] });
    }
    // Send the fields even when blank: an omitted field means "keep what's
    // stored" (so agent writes merge), so clearing one from the form has to
    // send the empty string.
    ops.push({
      addKeyPages: [
        {
          url: draft.url.trim(),
          role: draft.role,
          topic: draft.topic.trim(),
          notes: draft.notes.trim(),
        },
      ],
    });
    update.mutate(ops, {
      onSuccess: () => {
        setAdding(false);
        onEditingIdChange(null);
      },
    });
  };

  return (
    <section className="space-y-4" dir="rtl">
      <SectionHeader
        title={`صفحات مرجع برای SAM (${keyPages.length})`}
        hint="صفحات منتخب شما که موضوع، نقش و راهنمای استفاده از آن‌ها در زمینهٔ همین پروژه ذخیره می‌شود."
        action={
          <button
            type="button"
            className="btn btn-outline btn-sm shrink-0"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" />
            افزودن صفحه
          </button>
        }
      />

      <div className="rounded-xl bg-primary/5 p-4 text-sm leading-7">
        <p className="font-medium">این فهرست چه کمکی می‌کند؟</p>
        <p className="mt-1 text-base-content/75">
          SAM هنگام دریافت زمینهٔ پروژه، این صفحات و توضیحات شما را می‌خواند تا
          بداند هر صفحه دربارهٔ چیست و در پیشنهادها و نگارش محتوا آن را در نظر
          بگیرد. از «صفحات مهم» بالا صفحه‌ای اضافه کنید، سپس موضوع هدف و راهنمای
          آن را بنویسید.
        </p>
        <p className="mt-2 text-xs text-base-content/60">
          ذخیره یا حذف در این بخش فقط زمینهٔ همین پروژه را تغییر می‌دهد؛ صفحهٔ
          سایت شما ویرایش، منتشر یا حذف نمی‌شود.
        </p>
      </div>

      {adding ? (
        <div className={listClass}>
          <KeyPageForm
            pending={update.isPending}
            onCancel={() => setAdding(false)}
            onSave={(draft) => save(null, draft)}
          />
        </div>
      ) : null}

      {keyPages.length === 0 ? (
        adding ? null : (
          <EmptyState>
            هنوز صفحه‌ای انتخاب نکرده‌اید. در بخش «صفحات مهم»، «افزودن به زمینهٔ
            پروژه» را بزنید یا با «افزودن صفحه» نشانی یک صفحهٔ خدمات، محصول یا
            راهنما را وارد کنید.
          </EmptyState>
        )
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {keyPages.map((page) =>
            editingId === page.id ? (
              <li
                key={page.id}
                className="min-w-0 overflow-hidden rounded-xl border border-primary/40 lg:col-span-2"
              >
                <KeyPageForm
                  initial={page}
                  pending={update.isPending}
                  onCancel={() => onEditingIdChange(null)}
                  onSave={(draft) => save(page.url, draft)}
                />
              </li>
            ) : (
              <li
                key={page.id}
                className="flex min-w-0 flex-col rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-1 text-sm font-semibold leading-6 hover:text-primary"
                      title={page.url}
                    >
                      <span className="line-clamp-2 break-words">
                        {page.topic || keyPagePath(page.url)}
                      </span>
                      <ArrowUpLeft
                        className="mt-1 size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                    <p
                      className="mt-1 truncate text-xs text-base-content/50"
                      dir="ltr"
                      title={page.url}
                    >
                      {new URL(page.url).hostname}
                      {keyPagePath(page.url) === "صفحهٔ اصلی"
                        ? "/"
                        : keyPagePath(page.url)}
                    </p>
                  </div>
                </div>
                <dl className="my-4 space-y-3 border-t border-base-300 pt-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="text-xs text-base-content/60">نقش صفحه</dt>
                    <dd className="badge badge-ghost badge-sm">
                      {ROLE_LABELS[page.role]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-base-content/60">موضوع هدف</dt>
                    <dd className="mt-1 break-words">
                      {page.topic || "هنوز مشخص نشده؛ از ویرایش اضافه کنید."}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-base-content/60">
                      راهنمای SAM برای این صفحه
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-base-content/75">
                      {page.notes ||
                        "مثلاً: این صفحه مرجع معرفی خدمات است؛ در مطالب مرتبط به آن لینک بده."}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-3">
                  <Provenance by={page.updatedBy} at={page.updatedAt} />
                  <RowActions>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      aria-label={`ویرایش ${page.url}`}
                      onClick={() => onEditingIdChange(page.id)}
                    >
                      <Pencil className="size-3.5" />
                      ویرایش
                    </button>
                    <ConfirmDeleteButton
                      label={`حذف از زمینهٔ پروژه: ${page.url}`}
                      pending={update.isPending}
                      onConfirm={() =>
                        update.mutate([{ removeKeyPages: [page.url] }])
                      }
                    />
                  </RowActions>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

type KeyPageDraft = {
  url: string;
  role: KeyPageRole;
  topic: string;
  notes: string;
};

function KeyPageForm({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial?: ContextKeyPage;
  pending: boolean;
  onCancel: () => void;
  onSave: (draft: KeyPageDraft) => void;
}) {
  const [draft, setDraft] = React.useState<KeyPageDraft>({
    url: initial?.url ?? "",
    role: initial?.role ?? "other",
    topic: initial?.topic ?? "",
    notes: initial?.notes ?? "",
  });

  return (
    <form
      className="space-y-4 bg-base-200/30 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.url.trim() || pending) return;
        onSave(draft);
      }}
    >
      <label className="block space-y-1 text-sm">
        <span>نشانی صفحه</span>
        <input
          dir="ltr"
          autoFocus
          type="text"
          value={draft.url}
          onChange={(event) => setDraft({ ...draft, url: event.target.value })}
          placeholder="example.com/pricing"
          maxLength={2048}
          className="input input-bordered input-sm w-full"
          aria-label="نشانی صفحه"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>نقش صفحه در سایت</span>
          <select
            value={draft.role}
            onChange={(event) =>
              setDraft({
                ...draft,
                role:
                  KEY_PAGE_ROLES.find((role) => role === event.target.value) ??
                  draft.role,
              })
            }
            className="select select-bordered select-sm w-full"
            aria-label="نقش صفحه"
          >
            {KEY_PAGE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>موضوع یا کلمهٔ کلیدی هدف</span>
          <input
            type="text"
            value={draft.topic}
            onChange={(event) =>
              setDraft({ ...draft, topic: event.target.value })
            }
            placeholder="موضوع هدف (اختیاری)"
            maxLength={200}
            className="input input-bordered input-sm w-full"
            aria-label="موضوع هدف"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>راهنمای SAM برای استفاده از این صفحه</span>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) =>
            setDraft({ ...draft, notes: event.target.value })
          }
          placeholder="مثلاً: صفحهٔ اصلی خدمات ماست؛ هنگام پیشنهاد محتوای مرتبط، این صفحه را در نظر بگیر."
          maxLength={500}
          className="textarea textarea-bordered w-full"
          aria-label="یادداشت صفحه"
        />
      </label>
      <FormActions
        pending={pending}
        disabled={!draft.url.trim()}
        onCancel={onCancel}
      />
    </form>
  );
}
