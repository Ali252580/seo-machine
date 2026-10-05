import { describe, expect, it } from "vitest";
import { openRouterCostUsd } from "./openrouter-cost";

describe("OpenRouter cost metadata", () => {
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
