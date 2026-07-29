import crypto from 'crypto';
import { env } from '../config/env.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function generateReference(prefix = 'CHAI') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function normalizeCurrency(value = 'USD') {
  return String(value || 'USD')
    .trim()
    .toUpperCase();
}

function toMinorUnit(amountMajor) {
  return Math.round(Number(amountMajor || 0) * 100);
}

export function verifyPaystackSignature(rawBody, signature) {
  if (!env.paystackSecretKey || !signature || !rawBody) {
    return false;
  }

  const hash = crypto.createHmac('sha512', env.paystackSecretKey).update(rawBody).digest('hex');

  return hash === signature;
}

export async function initializePaystackTransaction({
  registration,
  course,
  amountMajor,
  amountUsd,
  amountMinor,
  currency = 'USD'
}) {
  const normalizedCurrency = normalizeCurrency(currency);
  const reference = generateReference(`CHAI-PAYSTACK-${normalizedCurrency}`);

  const finalAmountMajor = Number(amountMajor || amountUsd || 0);
  const finalAmountMinor = amountMinor || toMinorUnit(finalAmountMajor);
  const finalAmountUsd = normalizedCurrency === 'USD' ? Number(amountUsd || finalAmountMajor) : 0;

  if (!['USD', 'NGN'].includes(normalizedCurrency)) {
    throw new Error('Paystack currently supports only USD and NGN for this checkout flow');
  }

  if (!finalAmountMajor || finalAmountMajor <= 0) {
    throw new Error(`Invalid Paystack ${normalizedCurrency} amount`);
  }

  if (env.paymentsMockMode || !env.paystackSecretKey) {
    return {
      reference,
      amountUsd: finalAmountUsd,
      amountMinor: finalAmountMinor,
      currency: normalizedCurrency,
      checkoutUrl: `${env.frontendUrl}/payment-success?provider=paystack&reference=${reference}&mock=true`,
      rawProviderResponse: {
        mock: true,
        message: `Paystack ${normalizedCurrency} mock checkout generated`
      }
    };
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: registration.email,
      amount: finalAmountMinor,
      currency: normalizedCurrency,
      reference,
      callback_url: env.paystackCallbackUrl,
      metadata: {
        registrationId: registration._id.toString(),
        courseId: course._id.toString(),
        courseSlug: course.slug,
        courseTitle: course.title,
        fullName: registration.fullName,
        phone: registration.phone,
        whatsapp: registration.whatsapp,
        country: registration.country,
        paymentCurrency: normalizedCurrency,
        paymentAmountMinor: finalAmountMinor
      }
    })
  });

  const result = await response.json();

  if (!response.ok || !result.status) {
    throw new Error(result.message || 'Paystack payment initialization failed');
  }

  return {
    reference,
    amountUsd: finalAmountUsd,
    amountMinor: finalAmountMinor,
    currency: normalizedCurrency,
    checkoutUrl: result.data.authorization_url,
    providerReference: result.data.access_code || '',
    rawProviderResponse: result
  };
}

export async function verifyPaystackTransaction(reference) {
  if (!env.paystackSecretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`
    }
  });

  const result = await response.json();

  if (!response.ok || !result.status) {
    throw new Error(result.message || 'Paystack verification failed');
  }

  return result;
}