import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },

    firstName: {
      type: String,
      required: true,
      trim: true
    },

    lastName: {
      type: String,
      required: true,
      trim: true
    },

    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    whatsapp: {
      type: String,
      default: '',
      trim: true
    },

    country: {
      type: String,
      required: true,
      trim: true
    },

    organization: {
      type: String,
      default: '',
      trim: true
    },

    jobTitle: {
      type: String,
      default: '',
      trim: true
    },

    howHeard: {
      type: String,
      default: '',
      trim: true
    },

    paymentPreference: {
      type: String,
      enum: ['card', 'invoice'],
      default: 'card'
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'invoice_requested', 'paid', 'failed'],
      default: 'pending'
    },

    zoomStatus: {
      type: String,
      enum: ['not_started', 'pending', 'registered', 'failed'],
      default: 'not_started'
    },

    zoomMeetingId: {
      type: String,
      default: '',
      trim: true
    },

    zoomRegistrantId: {
      type: String,
      default: '',
      trim: true
    },

    zoomJoinUrl: {
      type: String,
      default: '',
      trim: true
    },

    communicationConsent: {
      type: Boolean,
      default: false
    },

    marketingConsent: {
      type: Boolean,
      default: false
    },

    googleSheetsSyncedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

registrationSchema.index({ email: 1, course: 1 }, { unique: true });

export const Registration = mongoose.model('Registration', registrationSchema);