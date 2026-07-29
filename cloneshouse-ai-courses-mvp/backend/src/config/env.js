import dotenv from 'dotenv';

dotenv.config();

function parseCsv(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cloneshouse_ai_courses',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendAllowedOrigins: parseCsv(process.env.FRONTEND_ALLOWED_ORIGINS || ''),

  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',

  paymentsMockMode: process.env.PAYMENTS_MOCK_MODE === 'true',

  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:5173/payment-success',

  squadSecretKey: process.env.SQUAD_SECRET_KEY || '',
  squadBaseUrl: process.env.SQUAD_BASE_URL || 'https://sandbox-api-d.squadco.com',
  squadCallbackUrl: process.env.SQUAD_CALLBACK_URL || 'http://localhost:5173/payment-success',
  squadWebhookSignatureRequired: process.env.SQUAD_WEBHOOK_SIGNATURE_REQUIRED !== 'false',

  zoomAccountId: process.env.ZOOM_ACCOUNT_ID || '',
  zoomClientId: process.env.ZOOM_CLIENT_ID || '',
  zoomClientSecret: process.env.ZOOM_CLIENT_SECRET || '',
  zoomCustomGptsMeetingId: process.env.ZOOM_CUSTOM_GPTS_MEETING_ID || '',
  zoomAiAgentsMeetingId: process.env.ZOOM_AI_AGENTS_MEETING_ID || '',

  emailFrom: process.env.EMAIL_FROM || 'foundation@cloneshouse.com',
  adminEmail: process.env.ADMIN_EMAIL || 'foundation@cloneshouse.com',

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',

  googleSheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || ''
};