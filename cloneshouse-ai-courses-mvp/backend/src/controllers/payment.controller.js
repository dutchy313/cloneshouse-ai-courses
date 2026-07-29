import { Course } from '../models/Course.js';
import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { initializePaystackTransaction } from '../services/paystack.service.js';
import { initializeSquadTransaction } from '../services/squad.service.js';
import { syncPaymentToGoogleSheets } from '../services/googleSheets.service.js';
import { sendAdminAlert, sendPaymentConfirmation } from '../services/email.service.js';
import { completeAdmissionAfterPayment } from '../services/admission.service.js';
import { getCoursePriceByCurrency } from '../services/pricing.service.js';

const SUPPORTED_PROVIDERS = ['paystack', 'squad'];
const SUPPORTED_CURRENCIES = ['USD', 'NGN'];

function normalizeCurrency(value) {
  return String(value || 'USD')
    .trim()
    .toUpperCase();
}

function getAmountMinor(amountMajor) {
  return Math.round(Number(amountMajor || 0) * 100);
}

function getAmountUsdForStorage(amountMajor, currency) {
  return currency === 'USD' ? Number(amountMajor || 0) : 0;
}

function buildPaymentStatusResponse(payment) {
  return {
    reference: payment.reference,
    provider: payment.provider,
    status: payment.status,
    amountUsd: payment.amountUsd,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    paidAt: payment.paidAt,
    checkoutUrl: payment.checkoutUrl,
    courseTitle: payment.course?.title || '',
    courseSlug: payment.course?.slug || '',
    courseDate: payment.course?.dateLabel || '',
    fullName: payment.registration?.fullName || '',
    email: payment.registration?.email || '',
    paymentStatus: payment.registration?.paymentStatus || '',
    zoomStatus: payment.registration?.zoomStatus || ''
  };
}

export async function initializePayment(req, res, next) {
  try {
    const {
      registrationId,
      provider = 'paystack',
      currency: requestedCurrency = 'USD'
    } = req.body;

    const currency = normalizeCurrency(requestedCurrency);

    if (!registrationId) {
      return res.status(400).json({ message: 'Registration ID is required' });
    }

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: 'Unsupported payment provider' });
    }

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return res.status(400).json({ message: 'Unsupported payment currency' });
    }

    if (provider === 'squad' && currency !== 'USD') {
      return res.status(400).json({
        message:
          'Squad is currently available for US$ payments only. Please choose Paystack for Nigerian Naira payment.'
      });
    }

    const registration = await Registration.findById(registrationId);

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const course = await Course.findById(registration.course);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const amountMajor = getCoursePriceByCurrency(course, currency);
    const amountMinor = getAmountMinor(amountMajor);
    const amountUsd = getAmountUsdForStorage(amountMajor, currency);

    if (!amountMajor || amountMajor <= 0) {
      return res.status(400).json({
        message: `No valid ${currency} price is configured for this course`
      });
    }

    const providerResult =
      provider === 'squad'
        ? await initializeSquadTransaction({
            registration,
            course,
            amountUsd: amountMajor
          })
        : await initializePaystackTransaction({
            registration,
            course,
            amountMajor,
            amountUsd,
            amountMinor,
            currency
          });

    const payment = await Payment.create({
      registration: registration._id,
      course: course._id,
      provider,
      reference: providerResult.reference,
      providerReference: providerResult.providerReference || '',
      amountUsd,
      amountMinor,
      currency,
      status: 'pending',
      checkoutUrl: providerResult.checkoutUrl,
      rawProviderResponse: providerResult.rawProviderResponse || {}
    });

    registration.paymentPreference = 'card';
    registration.paymentStatus = 'pending';
    await registration.save();

    res.status(201).json({
      paymentId: payment._id,
      reference: payment.reference,
      provider: payment.provider,
      status: payment.status,
      amountUsd: payment.amountUsd,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      checkoutUrl: payment.checkoutUrl
    });
  } catch (error) {
    next(error);
  }
}

export async function markPaymentAsPaid({ reference, provider, rawEvent = {} }) {
  const paidAt = new Date();

  const payment = await Payment.findOneAndUpdate(
    {
      reference,
      provider,
      status: { $ne: 'paid' }
    },
    {
      $set: {
        status: 'paid',
        rawWebhookEvent: rawEvent,
        paidAt
      }
    },
    {
      returnDocument: 'after'
    }
  )
    .populate('registration')
    .populate('course');

  if (!payment) {
    const existingPayment = await Payment.findOne({ reference, provider })
      .populate('registration')
      .populate('course');

    if (!existingPayment) {
      throw new Error(`Payment not found for reference ${reference}`);
    }

    return existingPayment;
  }

  const registration = payment.registration;
  const course = payment.course;

  registration.paymentStatus = 'paid';
  await registration.save();

  try {
    await syncPaymentToGoogleSheets({
      registration,
      course,
      payment
    });
  } catch (syncError) {
    console.warn('Google Sheets payment sync failed:', syncError.message);
  }

  try {
    await sendPaymentConfirmation({
      registration,
      course,
      payment
    });
  } catch (emailError) {
    console.warn('Payment confirmation email failed:', emailError.message);
  }

  try {
    await sendAdminAlert({
      subject: `Payment confirmed: ${course.title}`,
      details: {
        course: course.title,
        courseDate: course.dateLabel,
        courseTime: course.timeLabel,
        registrationId: registration._id.toString(),
        paymentId: payment._id.toString(),
        fullName: registration.fullName,
        email: registration.email,
        phone: registration.phone,
        whatsapp: registration.whatsapp,
        country: registration.country,
        organization: registration.organization,
        jobTitle: registration.jobTitle,
        paymentProvider: payment.provider,
        paymentReference: payment.reference,
        amountUsd: payment.amountUsd,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        paymentStatus: registration.paymentStatus,
        paidAt: payment.paidAt?.toISOString()
      }
    });
  } catch (adminEmailError) {
    console.warn('Admin payment alert email failed:', adminEmailError.message);
  }

  try {
    await completeAdmissionAfterPayment({
      registration,
      course,
      payment
    });
  } catch (admissionError) {
    console.warn('Admission completion failed:', admissionError.message);
  }

  return payment;
}

export async function confirmMockPayment(req, res, next) {
  try {
    const { reference, provider = 'paystack' } = req.body;

    if (!reference) {
      return res.status(400).json({ message: 'Payment reference is required' });
    }

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: 'Unsupported payment provider' });
    }

    const payment = await markPaymentAsPaid({
      reference,
      provider,
      rawEvent: {
        mock: true,
        confirmedAt: new Date().toISOString()
      }
    });

    res.json({
      confirmed: true,
      reference: payment.reference,
      provider: payment.provider,
      status: payment.status,
      amountUsd: payment.amountUsd,
      amountMinor: payment.amountMinor,
      currency: payment.currency
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentStatus(req, res, next) {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ message: 'Payment reference is required' });
    }

    const payment = await Payment.findOne({ reference })
      .populate('registration')
      .populate('course');

    if (!payment) {
      return res.status(404).json({
        message: 'Payment not found',
        reference,
        status: 'not_found'
      });
    }

    res.json({
      payment: buildPaymentStatusResponse(payment)
    });
  } catch (error) {
    next(error);
  }
}