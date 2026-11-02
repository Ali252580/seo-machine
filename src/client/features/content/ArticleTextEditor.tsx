import { useEffect, useRef, useState } from "react";
import {
  canEditArticleVisually,
  normalizeEditorHtml,
} from "./articleEditorHtml";

export function ArticleTextEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [source, setSource] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);
  const compatible = canEditArticleVisually(value);
  const visual = !source && compatible;

  useEffect(() => {
    // Do not reset the DOM on each keystroke: Persian composition and the caret must survive.
    if (
      visual &&
      editor.current &&
      (emitted.current !== value || editor.current.innerHTML === "")
    ) {
      editor.current.innerHTML = value;
      emitted.current = value;
    }
  }, [value, visual]);

  function save() {
    if (!editor.current) return;
    emitted.current = normalizeEditorHtml(editor.current.innerHTML);
    onChange(emitted.current);
  }

  function addBlock(tag: "p" | "h2" | "h3" | "ul") {
    if (!editor.current) return;
    const block = document.createElement(tag);
    const target =
      tag === "ul" ? block.appendChild(document.createElement("li")) : block;
    target.appendChild(document.createElement("br"));
    editor.current.appendChild(block);
    editor.current.focus();
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    save();
  }

  return (
    <section className="min-w-0 space-y-3" aria-label="ویرایش متن مقاله">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">متن مقاله</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled || !compatible}
          aria-pressed={source}
          onClick={() => {
            emitted.current = null;
            setSource(!source);
          }}
        >
          {source ? "ویرایش دیداری" : "ویرایش HTML"}
        </button>
      </div>
      {!compatible && (
        <p className="text-sm text-warning" role="status">
          متن دارای قالب‌بندی خارج از ویرایشگر ساده است؛ برای حفظ کامل محتوا،
          حالت HTML نمایش داده می‌شود.
        </p>
      )}
      {visual ? (
        <>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="افزودن بخش به انتهای مقاله"
          >
            {(
              [
                ["p", "پاراگراف"],
                ["h2", "تیتر اصلی"],
                ["h3", "زیرتیتر"],
                ["ul", "فهرست"],
              ] as const
            ).map(([tag, label]) => (
              <button
                key={tag}
                type="button"
                className="btn btn-outline btn-sm"
                disabled={disabled}
                onClick={() => addBlock(tag)}
              >
                + {label}
              </button>
            ))}
          </div>
          <p
            id="article-edit-help"
            className="text-xs leading-6 text-base-content/60"
          >
            روی متن کلیک کنید و بنویسید. دکمه‌ها بخش جدیدی به انتهای مقاله اضافه
            می‌کنند. متن چسبانده‌شده بدون قالب‌بندی وارد می‌شود.
          </p>
          <div
            ref={editor}
            role="textbox"
            aria-label="متن مقاله"
            aria-multiline="true"
            aria-describedby="article-edit-help"
            aria-disabled={disabled}
            contentEditable={!disabled}
            suppressContentEditableWarning
            dir="rtl"
            className="min-h-96 rounded-lg border border-base-300 p-4 leading-8 break-words focus-visible:outline-2 focus-visible:outline-primary [&_h2]:my-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:list-inside [&_ul]:list-disc [&_ol]:list-inside [&_ol]:list-decimal"
            onInput={save}
            onDrop={(event) => event.preventDefault()}
            onPaste={(event) => {
              event.preventDefault();
              if (disabled) return;
              const selection = window.getSelection();
              if (
                !selection?.rangeCount ||
                !editor.current?.contains(selection.anchorNode) ||
                !editor.current.contains(selection.focusNode)
              )
                return;
              const range = selection.getRangeAt(0);
              range.deleteContents();
              const fragment = document.createDocumentFragment();
              event.clipboardData
                .getData("text/plain")
                .split(/\r?\n/)
                .forEach((line, index) => {
                  if (index) fragment.appendChild(document.createElement("br"));
                  fragment.appendChild(document.createTextNode(line));
                });
              const last = fragment.lastChild!;
              range.insertNode(fragment);
              range.setStartAfter(last);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              save();
            }}
          />
        </>
      ) : (
        <textarea
          aria-label="متن مقاله به صورت HTML"
          className="textarea textarea-bordered min-h-96 w-full font-mono text-sm"
          dir="rtl"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </section>
  );
}
