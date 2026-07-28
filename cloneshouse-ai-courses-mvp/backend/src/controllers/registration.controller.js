import { z } from 'zod';
import { Course } from '../models/Course.js';
import { Registration } from '../models/Registration.js';
import { syncRegistrationToGoogleSheets } from '../services/googleSheets.service.js';
import { sendAdminAlert, sendInvoiceRequestConfirmation } from '../services/email.service.js';

const e164PhoneRegex = /^\+[1-9]\d{7,14}$/;

function normalizePhone(value = '') {
  return String(value).trim().replace(/[()\s.-]/g, '');
}

const registrationSchema = z.object({
  courseSlug: z.string().min(2),
  firstName: z.string().trim().min(2, 'First name is required'),
  lastName: z.string().trim().min(2, 'Last name is required'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),

  phone: z
    .string()
    .transform(normalizePhone)
    .refine((value) => e164PhoneRegex.test(value), {
      message: 'Use an international phone number format, for example +2348137617995'
    }),

  whatsapp: z
    .string()
    .optional()
    .default('')
    .transform(normalizePhone)
    .refine((value) => value === '' || e164PhoneRegex.test(value), {
      message: 'Use an international WhatsApp number format, for example +2348137617995'
    }),

  country: z.string().trim().min(2, 'Country is required'),
  organization: z.string().trim().optional().default(''),
  jobTitle: z.string().trim().optional().default(''),
  howHeard: z.string().trim().optional().default(''),
  paymentPreference: z.enum(['card', 'invoice']).optional().default('card'),
  communicationConsent: z.boolean().optional().default(false),
  marketingConsent: z.boolean().optional().default(false)
});

export async function createRegistration(req, res, next) {
  try {
    const input = registrationSchema.parse(req.body);

    const course = await Course.findOne({ slug: input.courseSlug, isActive: true });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const firstName = input.firstName;
    const lastName = input.lastName;
    const fullName = `${firstName} ${lastName}`.trim();

    const paymentStatus = input.paymentPreference === 'invoice' ? 'invoice_requested' : 'pending';

    const registration = await Registration.findOneAndUpdate(
      { email: input.email, course: course._id },
      {
        $set: {
          course: course._id,
          firstName,
          lastName,
          fullName,
          email: input.email,
          phone: input.phone,
          whatsapp: input.whatsapp,
          country: input.country,
          organization: input.organization,
          jobTitle: input.jobTitle,
          howHeard: input.howHeard,
          paymentPreference: input.paymentPreference,
          paymentStatus,
          communicationConsent: input.communicationConsent,
          marketingConsent: input.marketingConsent || input.communicationConsent
        }
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    if (input.paymentPreference === 'invoice') {
      await sendAdminAlert({
        subject: 'New invoice / bank transfer registration request',
        details: {
          course: course.title,
          registrationId: registration._id.toString(),
          fullName: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          whatsapp: registration.whatsapp,
          country: registration.country,
          organization: registration.organization,
          jobTitle: registration.jobTitle,
          paymentStatus: registration.paymentStatus
        }
      });

      await sendInvoiceRequestConfirmation({ registration, course });
    }

    try {
      await syncRegistrationToGoogleSheets({ registration, course });
      registration.googleSheetsSyncedAt = new Date();
      await registration.save();
    } catch (syncError) {
      console.warn('Google Sheets registration sync failed:', syncError.message);
    }

    res.status(201).json({
      registrationId: registration._id,
      paymentPreference: registration.paymentPreference,
      paymentStatus: registration.paymentStatus
    });
  } catch (error) {
    next(error);
  }
}