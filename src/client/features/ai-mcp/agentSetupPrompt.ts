import updatePrompt from "./agentUpdatePrompt.md?raw";

export const agentUpdatePrompt = updatePrompt.trim();

// The endpoint comes from the current instance, so moving domains needs no prompt edit.
export function getAgentSetupPrompt(origin: string) {
  const base = new URL(origin).origin;

  return `Connect this AI agent to my OpenSEO instance at ${base}/mcp.

1. Identify this agent and check whether OpenSEO is already connected. Preserve my other integrations and avoid duplicate connections.
2. Use this agent's supported remote MCP setup flow and the endpoint above. Prefer browser-based OAuth sign-in. Let me approve access in my browser; never ask me to paste a password or token into chat.
3. If this agent cannot use OAuth, direct me to ${base}/settings to create an API key. Have me save it in this agent's secret settings, never in chat or a repository.
4. Reload this agent if required, then verify the connection with the free whoami and list_projects tools. Report separately whether setup, sign-in, and tool verification succeeded. Do not run paid research during setup.
5. If this agent supports skills, offer to install the public SEO skills from https://github.com/chekad2525/seo-machine/tree/main/plugins/openseo/skills without changing this MCP endpoint or overwriting personal edits. Ask before installing them.

Give me only the manual steps this agent cannot perform. Once verified, show me how to ask for a keyword research or site audit using this connected OpenSEO instance.`;
}
