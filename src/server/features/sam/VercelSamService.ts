import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { buildChatAgentModel } from "@/server/lib/openrouter";
import { openRouterCostUsd } from "@/server/lib/openrouter-cost";
import { ProjectContextService } from "@/server/features/project-context/services/ProjectContextService";
import { SamMessageRepository } from "./SamMessageRepository";
import { SamSessionRepository } from "./SamSessionRepository";
import { buildSamMcpTools } from "./samChatTools";
import { buildSamSystemPrompt } from "./samSystemPrompt";
import { buildSamSkillSource } from "./samSkills";
import {
  checkUsageCreditsDepleted,
  trackUsageCreditSpend,
} from "@/server/billing/subscription";
import { MCP_SCOPE } from "@/lib/oauth-resource";
import type { EnsuredProject } from "@/middleware/ensure-user/types";
import type { ToolAuthContext } from "@/server/mcp/context";

type Caller = {
  userId: string;
  userEmail: string;
  organizationId: string;
  role: string;
  project: EnsuredProject;
};

async function requireSession(sessionId: string, caller: Caller) {
  const session = await SamSessionRepository.getActiveSession(
    sessionId,
    caller.userId,
  );
  if (!session || session.projectId !== caller.project.id) {
    throw new AppError("NOT_FOUND", "گفت‌وگو پیدا نشد.");
  }
  return session;
}

export async function listVercelSamMessages(sessionId: string, caller: Caller) {
  await requireSession(sessionId, caller);
  return SamMessageRepository.list(sessionId);
}

function publicOrigin() {
  const configured = process.env.APP_ORIGIN ?? process.env.BETTER_AUTH_URL;
  if (configured) return new URL(configured).origin;
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host}` : "https://seo-machine-api-lyart.vercel.app";
}

/** One bounded HTTP turn for Vercel; Cloudflare keeps its streaming DO path. */
export async function sendVercelSamMessage(
  sessionId: string,
  text: string,
  caller: Caller,
) {
  const session = await requireSession(sessionId, caller);
  const apiKey = await getOptionalEnvValue("OPENROUTER_API_KEY");
  if (!apiKey)
    throw new AppError("INTERNAL_ERROR", "کلید OpenRouter تنظیم نشده است.");

  // A claim serializes turns across tabs and Vercel instances. It is released
  // even when OpenRouter or a tool fails; a killed function expires in 2 min.
  const turnId = crypto.randomUUID();
  if (
    !(await SamSessionRepository.claimTurn(sessionId, caller.userId, turnId))
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "پاسخ قبلی هنوز در حال آماده‌سازی است.",
    );
  }
  try {
    const balance = await checkUsageCreditsDepleted({
      userId: caller.userId,
      userEmail: caller.userEmail,
      organizationId: caller.organizationId,
      projectId: caller.project.id,
    });
    if (balance.depleted) throw new AppError("INSUFFICIENT_CREDITS");

    const projectContext = await ProjectContextService.getProjectContext(
      caller.project.id,
    );
    const memory =
      ProjectContextService.renderProjectContextMarkdown(projectContext);
    const previous = await SamMessageRepository.list(sessionId, 18);
    const userMessage = await SamMessageRepository.append(
      sessionId,
      "user",
      text,
    );
    if (session.title === "New chat") {
      await SamSessionRepository.setTitle(
        sessionId,
        text.replace(/\s+/g, " ").slice(0, 60),
      );
    }

    const auth: ToolAuthContext = {
      userId: caller.userId,
      userEmail: caller.userEmail,
      organizationId: caller.organizationId,
      role: caller.role,
      orgScope: "pinned",
      scopes: [MCP_SCOPE],
      clientId: null,
      baseUrl: publicOrigin(),
    };
    // Vercel does not run Think's built-in skill registry. Expose the same
    // bundled public skills on demand so the model can follow their steps here.
    const skillSource = buildSamSkillSource();
    const skills = await skillSource.list();
    let remaining = balance.monthlyRemaining;
    const result = await generateText({
      model: buildChatAgentModel(
        apiKey,
        await getOptionalEnvValue("OPENROUTER_MODEL"),
        "low",
      ),
      system: [
        buildSamSystemPrompt(
          {
            projectId: caller.project.id,
            projectName: caller.project.name,
            domain: caller.project.domain,
            locationCode: caller.project.locationCode,
            languageCode: caller.project.languageCode,
          },
          {
            intakeMode:
              projectContext.missingSections.includes("business_overview"),
          },
        ),
        memory ? `project_context:\n${memory}` : "",
        `Available in-app skills: ${skills.map(({ name, description }) => `${name}: ${description}`).join("; ")}. When a request fits a skill, call activate_skill and follow its instructions using the available tools.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      messages: [...previous, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      })),
      tools: {
        ...buildSamMcpTools(auth, caller.project, turnId),
        activate_skill: tool({
          description:
            "Load an in-app SEO skill's workflow instructions before using it.",
          inputSchema: z.object({ name: z.string().min(1) }),
          execute: async ({ name }) => {
            const skill = await skillSource.load(name);
            return skill
              ? { name: skill.name, instructions: skill.body }
              : {
                  error: "Unknown skill",
                  available: skills.map((item) => item.name),
                };
          },
        }),
      },
      stopWhen: stepCountIs(5),
      maxOutputTokens: 2_000,
      abortSignal: AbortSignal.timeout(50_000),
      onStepFinish: async (step) => {
        // Charge every model step before another step can run. Shared MCP
        // tools account for their own paid provider calls separately.
        const cost = openRouterCostUsd(step.providerMetadata);
        if (cost === null) {
          throw new AppError(
            "INTERNAL_ERROR",
            "هزینهٔ مدل از OpenRouter دریافت نشد.",
          );
        }
        const charged = await trackUsageCreditSpend({
          customer: {
            userId: caller.userId,
            userEmail: caller.userEmail,
            organizationId: caller.organizationId,
            projectId: caller.project.id,
          },
          customerId: caller.organizationId,
          creditFeature: "agent",
          costUsd: cost,
          monthlyRemaining: remaining,
          properties: { provider: "openrouter", turn_id: turnId },
        });
        remaining -= charged.monthlyCredits + charged.topupCredits;
      },
    });

    const answer =
      result.text.trim() ||
      "برای این درخواست پاسخی دریافت نشد. لطفاً درخواست کوتاه‌تری بفرستید.";
    const assistantMessage = await SamMessageRepository.append(
      sessionId,
      "assistant",
      answer,
    );
    await SamSessionRepository.touch(sessionId);
    return { userMessage, assistantMessage };
  } finally {
    await SamSessionRepository.releaseTurn(sessionId, turnId);
  }
}
