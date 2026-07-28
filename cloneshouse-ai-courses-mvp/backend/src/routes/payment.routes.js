import { Router } from 'express';
import {
  confirmMockPayment,
  getPaymentStatus,
  initializePayment
} from '../controllers/payment.controller.js';

export const paymentRouter = Router();

paymentRouter.post('/init', initializePayment);
paymentRouter.post('/mock-confirm', confirmMockPayment);
paymentRouter.get('/status/:reference', getPaymentStatus);