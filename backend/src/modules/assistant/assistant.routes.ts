import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AssistantController } from './assistant.controller';

export const assistantRouter = Router();
const ctrl = new AssistantController();

// Assistant PUBLIC (landing page) — limité par IP pour protéger le crédit IA.
const assistantLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: "Vous avez atteint la limite de messages. Réessayez dans quelques minutes ou écrivez-nous sur WhatsApp.",
  },
});

assistantRouter.post('/chat', assistantLimiter, ctrl.chat);
