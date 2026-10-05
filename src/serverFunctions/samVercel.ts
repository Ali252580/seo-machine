import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  listVercelSamMessages,
  sendVercelSamMessage,
} from "@/server/features/sam/VercelSamService";
import { AppError } from "@/server/lib/errors";

const sessionSchema = z.object({
  projectId: z.string().min(1),
  sessionId: z.string().uuid(),
});

function requireVercel() {
  if (process.env.VERCEL !== "1" && import.meta.env.MODE !== "vercel") {
    throw new AppError("NOT_FOUND");
  }
}

export const getSamVercelMessages = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .validator(sessionSchema)
  .handler(async ({ data, context }) => {
    requireVercel();
    return listVercelSamMessages(data.sessionId, context);
  });

export const sendSamVercelMessage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(
    sessionSchema.extend({ text: z.string().trim().min(1).max(4_000) }),
  )
  .handler(async ({ data, context }) => {
    requireVercel();
    return sendVercelSamMessage(data.sessionId, data.text, context);
  });
