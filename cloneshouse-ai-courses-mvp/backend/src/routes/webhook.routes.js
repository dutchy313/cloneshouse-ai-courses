import { Router } from 'express';
import { handlePaystackWebhook, handleSquadWebhook } from '../controllers/webhook.controller.js';

export const webhookRouter = Router();

webhookRouter.post('/paystack', handlePaystackWebhook);
webhookRouter.post('/squad', handleSquadWebhook);