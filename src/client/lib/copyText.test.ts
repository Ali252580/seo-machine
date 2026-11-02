import { afterEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { copyTextToClipboard } from "./clipboard";
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("returns success only after the browser finishes copying", async () => {
  let finish!: () => void;
  const writeText = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const pending = copyTextToClipboard("متن");
  expect(writeText).toHaveBeenCalledWith("متن");
  finish();
  expect(await pending).toBe(true);
  expect(toast.error).not.toHaveBeenCalled();
});
it("reports denied clipboard permission without an unhandled rejection", async () => {
  vi.stubGlobal("navigator", {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
  });
  expect(await copyTextToClipboard("text")).toBe(false);
  expect(toast.error).toHaveBeenCalledOnce();
});
it("handles browsers without clipboard support", async () => {
  vi.stubGlobal("navigator", {});
  expect(await copyTextToClipboard("text")).toBe(false);
  expect(toast.error).toHaveBeenCalledOnce();
});
