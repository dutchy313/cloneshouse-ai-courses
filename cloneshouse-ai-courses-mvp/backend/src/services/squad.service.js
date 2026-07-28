import crypto from 'crypto';
import { env } from '../config/env.js';

function generateReference(prefix = 'CHAI') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function toMinorUnit(amountUsd) {
  return Math.round(Number(amountUsd) * 100);
}

function normalizeSignature(value = '') {
  return String(value)
    .trim()
    .replace(/^sha512=/i, '')
    .replace(/^hmac-sha512=/i, '')
    .toUpperCase();
}

function timingSafeEqualText(a, b) {
  const first = Buffer.from(String(a || ''), 'utf8');
  const second = Buffer.from(String(b || ''), 'utf8');

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
}

export function getSquadWebhookSignature(headers = {}) {
  return (
    headers['x-squad-encrypted-body'] ||
    headers['x-squad-signature'] ||
    headers['x-squad-hash'] ||
    headers['x-signature'] ||
    headers['signature'] ||
    ''
  );
}

export function getSquadSignatureCandidates({ rawBody, parsedBody }) {
  const candidates = [];

  if (rawBody) {
    candidates.push(rawBody);
  }

  if (parsedBody && typeof parsedBody === 'object') {
    candidates.push(JSON.stringify(parsedBody));
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function verifySquadSignature({ rawBody, parsedBody, signature }) {
  const cleanSignature = normalizeSignature(signature);

  if (!env.squadSecretKey || !cleanSignature) {
    return {
      valid: false,
      reason: 'missing_secret_or_signature'
    };
  }

  const candidates = getSquadSignatureCandidates({
    rawBody,
    parsedBody
  });

  for (const candidate of candidates) {
    const hash = crypto
      .createHmac('sha512', env.squadSecretKey)
      .update(candidate)
      .digest('hex')
      .toUpperCase();

    if (timingSafeEqualText(hash, cleanSignature)) {
      return {
        valid: true,
        matchedBodyLength: candidate.length
      };
    }
  }

  return {
    valid: false,
    reason: 'signature_mismatch',
    candidateCount: candidates.length,
    hasRawBody: Boolean(rawBody),
    rawBodyLength: rawBody?.length || 0
  };
}

export async function initializeSquadTransaction({ registration, course, amountUsd }) {
  const reference = generateReference('CHAI-SQUAD');
  const amountMinor = toMinorUnit(amountUsd);

  if (env.paymentsMockMode || !env.squadSecretKey) {
    return {
      reference,
      amountUsd,
      amountMinor,
      currency: 'USD',
      checkoutUrl: `${env.frontendUrl}/payment-success?provider=squad&reference=${reference}&mock=true`,
      rawProviderResponse: {
        mock: true,
        message: 'Squad mock checkout generated'
      }
    };
  }

  const response = await fetch(`${env.squadBaseUrl}/transaction/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.squadSecretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amountMinor,
      email: registration.email,
      currency: 'USD',
      initiate_type: 'inline',
      transaction_ref: reference,
      callback_url: env.squadCallbackUrl,
      customer_name: registration.fullName,
      metadata: {
        registrationId: registration._id.toString(),
        courseId: course._id.toString(),
        courseSlug: course.slug,
        fullName: registration.fullName,
        phone: registration.phone,
        whatsapp: registration.whatsapp,
        country: registration.country
      }
    })
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Squad initiate error:', result);
    throw new Error(result.message || 'Squad payment initialization failed');
  }

  const checkoutUrl =
    result.data?.checkout_url ||
    result.data?.payment_url ||
    result.data?.authorization_url ||
    result.data?.checkoutUrl ||
    result.data?.link ||
    result.checkout_url ||
    result.payment_url ||
    '';

  if (!checkoutUrl) {
    console.error('Squad initiate response without checkout URL:', result);
    throw new Error('Squad did not return a checkout URL. Check the response format in your Squad account.');
  }

  return {
    reference,
    amountUsd,
    amountMinor,
    currency: 'USD',
    checkoutUrl,
    providerReference: result.data?.gateway_ref || result.data?.transaction_ref || result.data?.reference || '',
    rawProviderResponse: result
  };
}