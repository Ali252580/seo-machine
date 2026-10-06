import { describe, expect, it } from "vitest";
import { getAgentSetupPrompt } from "./agentSetupPrompt";

describe("agent setup prompt", () => {
  it("connects to the supplied instance without pointing at another hosted service", () => {
    const prompt = getAgentSetupPrompt("https://seo.example.com/new-path");
    expect(prompt).toContain("https://seo.example.com/mcp");
    expect(prompt).toContain("https://seo.example.com/settings");
    expect(prompt).toContain("whoami and list_projects");
    expect(prompt).not.toContain("app.openseo.so");
    expect(prompt).not.toContain("seo-machine-api-lyart.vercel.app");
  });
});
