import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function hasSmtpConfig() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

function getTransporter() {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    },
    requireTLS: env.smtpPort === 587
  });
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCurrency(amount, currency = 'USD') {
  if (currency === 'USD') {
    return `US$${Number(amount).toLocaleString('en-US', {
      maximumFractionDigits: 0
    })}`;
  }

  return `${currency} ${Number(amount).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;
}

function formatSupportBlock() {
  return `
Need help?
Email: foundation@cloneshouse.com
WhatsApp: +234 813 761 7995
`;
}

function buildHtmlLayout({ title, previewText, body }) {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f7fb; color:#132238; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${escapeHtml(previewText || title)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #dbe4ef;">
            <tr>
              <td style="padding:28px 30px; background:#123c69; color:#ffffff;">
                <div style="font-size:13px; letter-spacing:0.12em; text-transform:uppercase; font-weight:700;">
                  Cloneshouse
                </div>
                <h1 style="margin:10px 0 0; font-size:28px; line-height:1.15;">
                  ${escapeHtml(title)}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:30px;">
                ${body}
              </td>
            </tr>

            <tr>
              <td style="padding:22px 30px; background:#f5f7fa; color:#5c6b7c; font-size:14px; line-height:1.6;">
                <strong style="color:#132238;">Need help?</strong><br />
                Email:
                <a href="mailto:foundation@cloneshouse.com" style="color:#123c69; font-weight:700;">
                  foundation@cloneshouse.com
                </a>
                <br />
                WhatsApp:
                <a href="https://wa.me/2348137617995" style="color:#123c69; font-weight:700;">
                  +234 813 761 7995
                </a>
              </td>
            </tr>
          </table>

          <p style="max-width:680px; margin:14px auto 0; color:#758396; font-size:12px; line-height:1.5;">
            You received this email because you registered for a Cloneshouse AI course.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

function buildDetailRows(details = {}) {
  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (character) => character.toUpperCase());

      return `
        <tr>
          <td style="padding:10px 0; color:#5c6b7c; border-bottom:1px solid #edf1f6; width:38%;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:10px 0; color:#132238; border-bottom:1px solid #edf1f6; font-weight:700;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `;
    })
    .join('');
}

async function sendEmail({ to, subject, text, html, replyTo }) {
  const cleanTo = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (cleanTo.length === 0) {
    console.warn('EMAIL SKIPPED: no recipient provided');
    return { sent: false, mocked: false, reason: 'missing_recipient' };
  }

  if (!hasSmtpConfig()) {
    console.log('EMAIL MOCK:', {
      to: cleanTo,
      subject,
      text
    });

    return { sent: false, mocked: true };
  }

  const transporter = getTransporter();

  const result = await transporter.sendMail({
    from: `"Cloneshouse" <${env.emailFrom}>`,
    to: cleanTo,
    replyTo: replyTo || env.emailFrom,
    subject,
    text,
    html
  });

  console.log('EMAIL SENT:', {
    to: cleanTo,
    subject,
    messageId: result.messageId
  });

  return { sent: true, mocked: false, messageId: result.messageId };
}

export async function verifyEmailTransport() {
  if (!hasSmtpConfig()) {
    console.log('EMAIL MOCK MODE: SMTP settings are incomplete.');
    return { ok: false, mocked: true };
  }

  const transporter = getTransporter();
  await transporter.verify();

  console.log('SMTP connection verified successfully.');
  return { ok: true, mocked: false };
}

export async function sendAdminAlert({ subject, details }) {
  const rows = buildDetailRows(details);

  const html = buildHtmlLayout({
    title: subject,
    previewText: subject,
    body: `
      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        A new Cloneshouse course event needs your attention.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows}
      </table>
    `
  });

  const text = `
${subject}

${Object.entries(details || {})
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

${formatSupportBlock()}
`;

  return sendEmail({
    to: env.adminEmail,
    subject,
    text,
    html
  });
}

export async function sendInvoiceRequestConfirmation({ registration, course }) {
  const subject = `Registration received: ${course.title}`;

  const html = buildHtmlLayout({
    title: 'Registration received',
    previewText: `Your registration for ${course.title} has been received.`,
    body: `
      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Hello ${escapeHtml(registration.firstName || registration.fullName)},
      </p>

      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Thank you for registering for <strong>${escapeHtml(course.title)}</strong>.
        You selected invoice / bank transfer support. The Cloneshouse team will contact you with payment instructions.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
        ${buildDetailRows({
          course: course.title,
          date: course.dateLabel,
          time: course.timeLabel,
          name: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          whatsapp: registration.whatsapp,
          country: registration.country,
          paymentStatus: registration.paymentStatus
        })}
      </table>
    `
  });

  const text = `
Hello ${registration.firstName || registration.fullName},

Thank you for registering for ${course.title}.

You selected invoice / bank transfer support. The Cloneshouse team will contact you with payment instructions.

Course: ${course.title}
Date: ${course.dateLabel}
Time: ${course.timeLabel}
Name: ${registration.fullName}
Email: ${registration.email}
Phone: ${registration.phone}
WhatsApp: ${registration.whatsapp || ''}
Country: ${registration.country}
Payment status: ${registration.paymentStatus}

${formatSupportBlock()}
`;

  return sendEmail({
    to: registration.email,
    subject,
    text,
    html
  });
}

export async function sendPaymentConfirmation({ registration, course, payment }) {
  const subject = `Payment confirmed: ${course.title}`;

  const html = buildHtmlLayout({
    title: 'Payment confirmed',
    previewText: `Your payment for ${course.title} has been confirmed.`,
    body: `
      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Hello ${escapeHtml(registration.firstName || registration.fullName)},
      </p>

      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Thank you. Your payment for <strong>${escapeHtml(course.title)}</strong> has been confirmed.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
        ${buildDetailRows({
          course: course.title,
          date: course.dateLabel,
          time: course.timeLabel,
          amountPaid: `${formatCurrency(payment.amountUsd, payment.currency)} ${payment.currency}`,
          paymentProvider: payment.provider,
          paymentReference: payment.reference,
          paymentStatus: payment.status
        })}
      </table>

      <p style="margin:22px 0 0; color:#34465c; line-height:1.7;">
        Your Zoom admission details will be sent to you by email.
      </p>
    `
  });

  const text = `
Hello ${registration.firstName || registration.fullName},

Thank you. Your payment for ${course.title} has been confirmed.

Course: ${course.title}
Date: ${course.dateLabel}
Time: ${course.timeLabel}
Amount paid: ${formatCurrency(payment.amountUsd, payment.currency)} ${payment.currency}
Payment provider: ${payment.provider}
Payment reference: ${payment.reference}
Payment status: ${payment.status}

Your Zoom admission details will be sent to you by email.

${formatSupportBlock()}
`;

  return sendEmail({
    to: registration.email,
    subject,
    text,
    html
  });
}

export async function sendAdmissionEmail({ registration, course, payment, zoomJoinUrl }) {
  const subject = `Your Zoom details: ${course.title}`;

  const zoomContent = zoomJoinUrl
    ? `
      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Use the button below to join the live session at the scheduled time.
      </p>

      <p style="margin:24px 0;">
        <a href="${escapeHtml(zoomJoinUrl)}" style="display:inline-block; padding:14px 18px; border-radius:999px; background:#123c69; color:#ffffff; text-decoration:none; font-weight:800;">
          Join Zoom session
        </a>
      </p>
    `
    : `
      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Your payment is confirmed. The Cloneshouse team will send your Zoom join link before the session.
      </p>
    `;

  const html = buildHtmlLayout({
    title: 'Your course admission details',
    previewText: `Admission details for ${course.title}.`,
    body: `
      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Hello ${escapeHtml(registration.firstName || registration.fullName)},
      </p>

      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        Your admission for <strong>${escapeHtml(course.title)}</strong> is confirmed.
      </p>

      ${zoomContent}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
        ${buildDetailRows({
          course: course.title,
          date: course.dateLabel,
          time: course.timeLabel,
          name: registration.fullName,
          email: registration.email,
          paymentReference: payment?.reference || '',
          zoomStatus: registration.zoomStatus
        })}
      </table>
    `
  });

  const text = `
Hello ${registration.firstName || registration.fullName},

Your admission for ${course.title} is confirmed.

${zoomJoinUrl ? `Join Zoom session: ${zoomJoinUrl}` : 'The Cloneshouse team will send your Zoom join link before the session.'}

Course: ${course.title}
Date: ${course.dateLabel}
Time: ${course.timeLabel}
Name: ${registration.fullName}
Email: ${registration.email}
Payment reference: ${payment?.reference || ''}
Zoom status: ${registration.zoomStatus}

${formatSupportBlock()}
`;

  return sendEmail({
    to: registration.email,
    subject,
    text,
    html
  });
}

export async function sendTestEmail({ to }) {
  const subject = 'Cloneshouse SMTP test email';

  const html = buildHtmlLayout({
    title: 'SMTP test successful',
    previewText: 'Your Cloneshouse backend can send real email.',
    body: `
      <p style="margin:0 0 18px; color:#34465c; line-height:1.7;">
        This is a test email from the Cloneshouse AI courses backend.
      </p>

      <p style="margin:0; color:#34465c; line-height:1.7;">
        If you received this message, your SMTP settings are working.
      </p>
    `
  });

  const text = `
Cloneshouse SMTP test successful

This is a test email from the Cloneshouse AI courses backend.

If you received this message, your SMTP settings are working.

${formatSupportBlock()}
`;

  return sendEmail({
    to,
    subject,
    text,
    html
  });
}