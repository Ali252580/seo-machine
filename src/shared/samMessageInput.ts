import { z } from "zod";

export const samMessageInput = z
  .object({
    projectId: z.string().min(1),
    sessionId: z.string().uuid(),
    text: z.string().trim().min(1).max(8_000),
    article: z.boolean().optional(),
  })
  .refine((data) => data.article || data.text.length <= 4_000, {
    path: ["text"],
    message: "Chat messages must not exceed 4000 characters",
  });
