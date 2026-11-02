import { afterEach, expect, it, vi } from "vitest";
import { debugDomain } from "./domainDebug";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("does not crash domain queries when browser storage is disabled", () => {
  vi.stubGlobal("window", {
    get localStorage() {
      throw new Error("SecurityError");
    },
    location: { search: "" },
  });
  expect(() => debugDomain("query")).not.toThrow();
});
it("allows explicit URL diagnostics without requiring storage", () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal("window", {
    get localStorage() {
      throw new Error("SecurityError");
    },
    location: { search: "?debugDomain=1" },
  });
  debugDomain("query");
  expect(info).toHaveBeenCalledOnce();
});
