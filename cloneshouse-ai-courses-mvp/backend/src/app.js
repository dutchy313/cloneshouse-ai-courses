import express from 'express';
import cors from 'cors';
import { courseRouter } from './routes/course.routes.js';
import { registrationRouter } from './routes/registration.routes.js';
import { paymentRouter } from './routes/payment.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';

export const app = express();

const allowedOrigins = [
  env.frontendUrl,

  // Vite development server
  'http://localhost:5173',
  'http://127.0.0.1:5173',

  // Vite production preview server
  'http://localhost:4173',
  'http://127.0.0.1:4173'
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true
  })
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  })
);

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'cloneshouse-ai-courses-api',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/registrations', registrationRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/webhooks', webhookRouter);

app.use(errorHandler);