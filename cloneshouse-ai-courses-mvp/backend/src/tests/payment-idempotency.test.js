import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    paymentCreate: vi.fn(),
    paymentFindOneAndUpdate: vi.fn(),
    paymentFindOne: vi.fn(),

    courseFindById: vi.fn(),
    registrationFindById: vi.fn(),

    initializePaystackTransaction: vi.fn(),
    initializeSquadTransaction: vi.fn(),

    syncPaymentToGoogleSheets: vi.fn(),
    sendPaymentConfirmation: vi.fn(),
    sendAdminAlert: vi.fn(),
    completeAdmissionAfterPayment: vi.fn()
  };
});

function makePopulateQuery(result) {
  const query = {
    populate: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };

  return query;
}

vi.mock('../models/Payment.js', () => ({
  Payment: {
    create: mocks.paymentCreate,
    findOneAndUpdate: mocks.paymentFindOneAndUpdate,
    findOne: mocks.paymentFindOne
  }
}));

vi.mock('../models/Course.js', () => ({
  Course: {
    findById: mocks.courseFindById
  }
}));

vi.mock('../models/Registration.js', () => ({
  Registration: {
    findById: mocks.registrationFindById
  }
}));

vi.mock('../services/paystack.service.js', () => ({
  initializePaystackTransaction: mocks.initializePaystackTransaction
}));

vi.mock('../services/squad.service.js', () => ({
  initializeSquadTransaction: mocks.initializeSquadTransaction
}));

vi.mock('../services/googleSheets.service.js', () => ({
  syncPaymentToGoogleSheets: mocks.syncPaymentToGoogleSheets
}));

vi.mock('../services/email.service.js', () => ({
  sendPaymentConfirmation: mocks.sendPaymentConfirmation,
  sendAdminAlert: mocks.sendAdminAlert
}));

vi.mock('../services/admission.service.js', () => ({
  completeAdmissionAfterPayment: mocks.completeAdmissionAfterPayment
}));

const { markPaymentAsPaid } = await import('../controllers/payment.controller.js');

function buildPayment({
  status = 'pending',
  provider = 'squad',
  reference = 'CHAI-SQUAD-123',
  amountUsd = 200,
  amountMinor = 20000,
  currency = 'USD'
} = {}) {
  const registration = {
    _id: {
      toString: () => 'registration-123'
    },
    fullName: 'Test Learner',
    email: 'learner@example.com',
    phone: '+2348137617995',
    whatsapp: '',
    country: 'Nigeria',
    organization: 'Cloneshouse Test',
    jobTitle: 'Evaluator',
    paymentStatus: 'pending',
    save: vi.fn().mockResolvedValue(true)
  };

  const course = {
    title: 'AI Agents for Evaluators',
    slug: 'ai-agents-for-evaluators',
    dateLabel: 'Thursday, September 24, 2026',
    timeLabel: '4pm–7pm WAT'
  };

  const payment = {
    _id: {
      toString: () => 'payment-123'
    },
    reference,
    provider,
    status,
    amountUsd,
    amountMinor,
    currency,
    paidAt: new Date('2026-07-27T12:00:00.000Z'),
    registration,
    course
  };

  return {
    payment,
    registration,
    course
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('markPaymentAsPaid idempotency', () => {
  it('runs payment side effects once when a pending USD payment becomes paid', async () => {
    const { payment, registration } = buildPayment();

    mocks.paymentFindOneAndUpdate.mockReturnValue(makePopulateQuery(payment));

    const result = await markPaymentAsPaid({
      reference: 'CHAI-SQUAD-123',
      provider: 'squad',
      rawEvent: {
        Event: 'charge_successful'
      }
    });

    expect(result.reference).toBe('CHAI-SQUAD-123');
    expect(result.currency).toBe('USD');
    expect(result.amountUsd).toBe(200);
    expect(result.amountMinor).toBe(20000);

    expect(mocks.paymentFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(registration.save).toHaveBeenCalledTimes(1);

    expect(mocks.syncPaymentToGoogleSheets).toHaveBeenCalledTimes(1);
    expect(mocks.sendPaymentConfirmation).toHaveBeenCalledTimes(1);
    expect(mocks.sendAdminAlert).toHaveBeenCalledTimes(1);
    expect(mocks.completeAdmissionAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('runs payment side effects once when a pending NGN Paystack payment becomes paid', async () => {
    const { payment, registration } = buildPayment({
      provider: 'paystack',
      reference: 'CHAI-PAYSTACK-NGN-123',
      amountUsd: 0,
      amountMinor: 14000000,
      currency: 'NGN'
    });

    mocks.paymentFindOneAndUpdate.mockReturnValue(makePopulateQuery(payment));

    const result = await markPaymentAsPaid({
      reference: 'CHAI-PAYSTACK-NGN-123',
      provider: 'paystack',
      rawEvent: {
        event: 'charge.success'
      }
    });

    expect(result.reference).toBe('CHAI-PAYSTACK-NGN-123');
    expect(result.provider).toBe('paystack');
    expect(result.currency).toBe('NGN');
    expect(result.amountUsd).toBe(0);
    expect(result.amountMinor).toBe(14000000);

    expect(mocks.paymentFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(registration.save).toHaveBeenCalledTimes(1);

    expect(mocks.syncPaymentToGoogleSheets).toHaveBeenCalledTimes(1);
    expect(mocks.sendPaymentConfirmation).toHaveBeenCalledTimes(1);
    expect(mocks.sendAdminAlert).toHaveBeenCalledTimes(1);
    expect(mocks.completeAdmissionAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('does not repeat side effects when the payment is already paid', async () => {
    const { payment, registration } = buildPayment({ status: 'paid' });

    mocks.paymentFindOneAndUpdate.mockReturnValue(makePopulateQuery(null));
    mocks.paymentFindOne.mockReturnValue(makePopulateQuery(payment));

    const result = await markPaymentAsPaid({
      reference: 'CHAI-SQUAD-123',
      provider: 'squad',
      rawEvent: {
        Event: 'charge_successful'
      }
    });

    expect(result.status).toBe('paid');

    expect(mocks.paymentFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.paymentFindOne).toHaveBeenCalledTimes(1);

    expect(registration.save).not.toHaveBeenCalled();
    expect(mocks.syncPaymentToGoogleSheets).not.toHaveBeenCalled();
    expect(mocks.sendPaymentConfirmation).not.toHaveBeenCalled();
    expect(mocks.sendAdminAlert).not.toHaveBeenCalled();
    expect(mocks.completeAdmissionAfterPayment).not.toHaveBeenCalled();
  });

  it('throws a clear error when no payment exists for the webhook reference', async () => {
    mocks.paymentFindOneAndUpdate.mockReturnValue(makePopulateQuery(null));
    mocks.paymentFindOne.mockReturnValue(makePopulateQuery(null));

    await expect(
      markPaymentAsPaid({
        reference: 'UNKNOWN-REFERENCE',
        provider: 'squad',
        rawEvent: {}
      })
    ).rejects.toThrow('Payment not found for reference UNKNOWN-REFERENCE');

    expect(mocks.syncPaymentToGoogleSheets).not.toHaveBeenCalled();
    expect(mocks.sendPaymentConfirmation).not.toHaveBeenCalled();
    expect(mocks.sendAdminAlert).not.toHaveBeenCalled();
    expect(mocks.completeAdmissionAfterPayment).not.toHaveBeenCalled();
  });
});