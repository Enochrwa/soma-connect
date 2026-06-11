import { Router } from "express";
import { z } from "zod";
import { somaAiReply } from "../services/ai.service.js";
import { validate } from "../middleware/validate.js";
import { strictLimiter } from "../middleware/rateLimiter.js";

export const aiRouter = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

aiRouter.post("/chat", strictLimiter, validate(chatSchema), async (req, res, next) => {
  try {
    const { messages } = req.body as z.infer<typeof chatSchema>;
    const reply = await somaAiReply(messages);
    res.json({ reply });
  } catch (e) {
    next(e);
  }
});
