import { afterEach, expect, it, vi } from "vitest";
import { confirmArticleReplacement } from "./confirmArticleReplacement";

afterEach(() => vi.unstubAllGlobals());

it("does not interrupt writing the first draft", () => {
  const confirm = vi.fn();
  vi.stubGlobal("window", { confirm });
  expect(confirmArticleReplacement("  ")).toBe(true);
  expect(confirm).not.toHaveBeenCalled();
});

it.each([false, true])("honors the replacement decision: %s", (accepted) => {
  const confirm = vi.fn(() => accepted);
  vi.stubGlobal("window", { confirm });
  expect(confirmArticleReplacement("<p>متن ویرایش‌شده</p>")).toBe(accepted);
  expect(confirm).toHaveBeenCalledOnce();
});
