import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ model: vi.fn() }));
vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: () => mocks.model,
}));
import { buildChatAgentModel } from "./openrouter";
beforeEach(() => mocks.model.mockClear());
it("defaults to free routing without forcing model-specific reasoning", () => {
  buildChatAgentModel("test-key");
  expect(mocks.model).toHaveBeenCalledWith("openrouter/free", {
    usage: { include: true },
  });
});
it("keeps explicit model overrides and paid reasoning settings", () => {
  buildChatAgentModel("test-key", "openai/gpt-5.6-luna", "low");
  expect(mocks.model).toHaveBeenCalledWith("openai/gpt-5.6-luna", {
    usage: { include: true },
    extraBody: { reasoning: { effort: "low" } },
  });
});
it("supports a fixed free model without max reasoning", () => {
  buildChatAgentModel("test-key", "google/gemma-4-31b-it:free");
  expect(mocks.model).toHaveBeenCalledWith("google/gemma-4-31b-it:free", {
    usage: { include: true },
  });
});
