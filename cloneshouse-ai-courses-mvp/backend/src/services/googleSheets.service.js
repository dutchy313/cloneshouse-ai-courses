import { env } from '../config/env.js';

function hasGoogleSheetsWebhook() {
  return Boolean(env.googleSheetsWebhookUrl);
}

function toIsoString(value) {
  if (!value) return '';

  try {
    return new Date(value).toISOString();
  } catch {
    return '';
  }
}

function getAmountMajor(payment) {
  if (!payment?.amountMinor) return '';

  return Number(payment.amountMinor) / 100;
}

function formatPaymentAmount(payment) {
  if (!payment) return '';

  const amountMajor = getAmountMajor(payment);

  if (amountMajor === '') return '';

  if (payment.currency === 'NGN') {
    return `₦${amountMajor.toLocaleString('en-US', {
      maximumFractionDigits: 0
    })}`;
  }

  if (payment.currency === 'USD') {
    return `US$${amountMajor.toLocaleString('en-US', {
      maximumFractionDigits: 0
    })}`;
  }

  return `${payment.currency || ''} ${amountMajor.toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`.trim();
}

function buildBasePayload({ registration, course, eventType }) {
  return {
    eventType,
    registrationId: registration._id?.toString() || '',
    course: course.title || '',
    courseSlug: course.slug || '',
    courseDate: course.dateLabel || '',
    courseTime: course.timeLabel || '',

    firstName: registration.firstName || '',
    lastName: registration.lastName || '',
    fullName: registration.fullName || '',
    email: registration.email || '',
    phone: registration.phone || '',
    whatsapp: registration.whatsapp || '',
    country: registration.country || '',
    organization: registration.organization || '',
    jobTitle: registration.jobTitle || '',
    howHeard: registration.howHeard || '',

    paymentPreference: registration.paymentPreference || '',
    paymentStatus: registration.paymentStatus || '',
    zoomStatus: registration.zoomStatus || '',

    communicationConsent: registration.communicationConsent ? 'Yes' : 'No',
    marketingConsent: registration.marketingConsent ? 'Yes' : 'No',

    zoomMeetingId: registration.zoomMeetingId || '',
    zoomRegistrantId: registration.zoomRegistrantId || '',
    admissionUpdatedAt: ''
  };
}

async function sendToGoogleSheets(payload) {
  if (!hasGoogleSheetsWebhook()) {
    console.log('GOOGLE SHEETS MOCK:', payload);
    return { synced: false, mocked: true };
  }

  const response = await fetch(env.googleSheetsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload })
  });

  const text = await response.text();

  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { raw: text };
  }

  if (!response.ok || result.ok === false) {
    console.error('Google Sheets sync error:', result);
    throw new Error(result.error || 'Google Sheets sync failed');
  }

  return { synced: true, mocked: false, result };
}

function buildPaymentPayload({ registration, course, payment, eventType }) {
  const amountMajor = getAmountMajor(payment);

  return {
    ...buildBasePayload({ registration, course, eventType }),

    // Keep this for USD-only reporting.
    // For NGN payments, this remains blank instead of putting Naira into a USD column.
    amountUsd: payment?.currency === 'USD' ? payment.amountUsd || amountMajor : '',

    // New readable and reporting-friendly fields.
    amountPaid: formatPaymentAmount(payment),
    amountMajor,
    amountMinor: payment?.amountMinor || '',

    currency: payment?.currency || '',
    paymentProvider: payment?.provider || '',
    paymentReference: payment?.reference || '',
    paidAt: toIsoString(payment?.paidAt)
  };
}

export async function syncRegistrationToGoogleSheets({ registration, course }) {
  const payload = buildBasePayload({
    registration,
    course,
    eventType: 'registration_submitted'
  });

  return sendToGoogleSheets(payload);
}

export async function syncPaymentToGoogleSheets({ registration, course, payment }) {
  const payload = buildPaymentPayload({
    registration,
    course,
    payment,
    eventType: 'payment_updated'
  });

  return sendToGoogleSheets(payload);
}

export async function syncAdmissionToGoogleSheets({ registration, course, payment }) {
  const payload = {
    ...buildPaymentPayload({
      registration,
      course,
      payment,
      eventType: 'admission_updated'
    }),
    admissionUpdatedAt: new Date().toISOString()
  };

  return sendToGoogleSheets(payload);
}