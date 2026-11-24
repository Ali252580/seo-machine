import { describe, expect, it } from "vitest";
import { openRouterCostUsd, textModelCostUsd } from "./openrouter-cost";

describe("OpenRouter cost metadata", () => {
  it("accepts confirmed zero APInex spend and rejects missing usage", () => {
    expect(textModelCostUsd("apinex", { apinex: { costUsd: 0 } })).toBe(0);
    expect(textModelCostUsd("apinex", {})).toBeNull();
  });
  it("only accepts a reported nonnegative cost", () => {
    expect(openRouterCostUsd({ openrouter: { usage: { cost: 0.002 } } })).toBe(
      0.002,
    );
    expect(openRouterCostUsd({ openrouter: { usage: {} } })).toBeNull();
    expect(
      openRouterCostUsd({ openrouter: { usage: { cost: -1 } } }),
    ).toBeNull();
  });
});
