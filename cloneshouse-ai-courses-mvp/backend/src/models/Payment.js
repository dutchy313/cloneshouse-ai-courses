import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    provider: {
      type: String,
      enum: ['paystack', 'squad'],
      required: true
    },

    reference: { type: String, required: true, unique: true, trim: true },
    providerReference: { type: String, default: '', trim: true },

    // For USD payments, this stores the US dollar amount.
    // For NGN payments, this stays 0 because the real amount is stored through currency + amountMinor.
    amountUsd: { type: Number, required: true, default: 0 },

    // Smallest currency unit:
    // USD: cents, for example US$100 = 10000
    // NGN: kobo, for example ₦140,000 = 14000000
    amountMinor: { type: Number, required: true },

    currency: {
      type: String,
      enum: ['USD', 'NGN'],
      default: 'USD',
      trim: true
    },

    status: {
      type: String,
      enum: ['initialized', 'pending', 'paid', 'failed'],
      default: 'initialized'
    },

    checkoutUrl: { type: String, default: '', trim: true },

    rawProviderResponse: { type: mongoose.Schema.Types.Mixed },
    rawWebhookEvent: { type: mongoose.Schema.Types.Mixed },

    paidAt: { type: Date }
  },
  { timestamps: true }
);

paymentSchema.index({ registration: 1, provider: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);