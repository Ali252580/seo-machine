import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

/**
 * Kebab actions menu rendered through a portal in fixed position, so it can't
 * be clipped by overflow containers (scrollable tables, overflow-hidden
 * cards). Opens below the trigger, right-aligned. Closes on outside click,
 * Escape, scroll, and resize.
 */
export function PortalMenu({
  ariaLabel,
  triggerClassName = "btn btn-ghost btn-xs btn-square",
  triggerContent = <MoreHorizontal className="size-3.5" />,
  menuClassName = "w-40",
  children,
}: {
  ariaLabel: string;
  triggerClassName?: string;
  triggerContent?: ReactNode;
  menuClassName?: string;
  /** Menu <li> items; call `close` before running an item's action. */
  children: (close: () => void) => ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isOpen) return;
    const trigger = buttonRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const bounds = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(
        8,
        Math.min(
          trigger.right - bounds.width,
          window.innerWidth - bounds.width - 8,
        ),
      ),
      top: Math.max(
        8,
        Math.min(trigger.bottom + 4, window.innerHeight - bounds.height - 8),
      ),
    });
    menu
      .querySelector<HTMLElement>("button:not(:disabled), a[href]")
      ?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (buttonRef.current?.contains(target) ||
          menuRef.current?.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    };
    const close = () => setIsOpen(false);
    const closeOnScroll = (event: Event) => {
      // Scrolling inside the menu itself shouldn't dismiss it.
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        {triggerContent}
      </button>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={menuRef}
              id={menuId}
              aria-label={ariaLabel}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget) &&
                  event.relatedTarget !== buttonRef.current
                )
                  setIsOpen(false);
              }}
              className={`menu fixed z-[1000] max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg ${menuClassName}`}
              style={{ top: position.top, left: position.left }}
            >
              {children(() => {
                setIsOpen(false);
                buttonRef.current?.focus({ preventScroll: true });
              })}
            </ul>,
            buttonRef.current?.closest("dialog") ?? document.body,
          )
        : null}
    </>
  );
}
