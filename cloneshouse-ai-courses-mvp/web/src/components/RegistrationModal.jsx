import { useState } from 'react';
import { api } from '../api/client.js';
import { countries } from '../data/countries.js';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  whatsapp: '',
  country: '',
  organization: '',
  jobTitle: '',
  howHeard: '',
  communicationConsent: true
};

const paymentOptions = [
  {
    value: 'paystack',
    title: 'Pay securely with Paystack',
    description: 'Pay online with card through Paystack secure checkout.',
    tag: 'Card payment'
  },
  {
    value: 'squad',
    title: 'Pay securely with Squad',
    description: 'Use Squad secure checkout as an alternative online payment option.',
    tag: 'Alternative checkout'
  },
  {
    value: 'invoice',
    title: 'Request invoice / bank transfer support',
    description: 'Submit your registration and the Cloneshouse team will contact you with payment instructions.',
    tag: 'Team support'
  }
];

const phonePattern = '^\\+[1-9][0-9]{7,14}$';

function formatCurrency(amount) {
  return `US$${Number(amount).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;
}

function getActivePrice(course) {
  const earlyBirdEndsAt = new Date(course.earlyBirdEndsAt).getTime();
  return Date.now() <= earlyBirdEndsAt ? course.earlyBirdPriceUsd : course.standardPriceUsd;
}

function getProviderFromPaymentOption(paymentOption) {
  if (paymentOption === 'squad') {
    return 'squad';
  }

  return 'paystack';
}

function normalizePhone(value) {
  return value.trim().replace(/[()\s.-]/g, '');
}

function validateForm(form) {
  const errors = {};

  const normalizedPhone = normalizePhone(form.phone);
  const normalizedWhatsapp = normalizePhone(form.whatsapp);

  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  if (!form.email.trim()) {
    errors.email = 'Email address is required.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!/^\+[1-9][0-9]{7,14}$/.test(normalizedPhone)) {
    errors.phone = 'Enter a valid phone number in international format, for example +2348137617995.';
  }

  if (form.whatsapp.trim() && !/^\+[1-9][0-9]{7,14}$/.test(normalizedWhatsapp)) {
    errors.whatsapp = 'Enter a valid WhatsApp number in international format, for example +2348137617995.';
  }

  if (!form.country) {
    errors.country = 'Select your country.';
  }

  return errors;
}

export function RegistrationModal({ course, onClose }) {
  const [form, setForm] = useState(initialForm);
  const [paymentOption, setPaymentOption] = useState('paystack');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!course) return null;

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: ''
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    setError('');

    const validationErrors = validateForm(form);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setStatus('idle');
      return;
    }

    const normalizedForm = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizePhone(form.phone),
      whatsapp: form.whatsapp.trim() ? normalizePhone(form.whatsapp) : '',
      organization: form.organization.trim(),
      jobTitle: form.jobTitle.trim()
    };

    try {
      const registrationResponse = await api.post('/api/v1/registrations', {
        ...normalizedForm,
        marketingConsent: normalizedForm.communicationConsent,
        courseSlug: course.slug,
        paymentPreference: paymentOption === 'invoice' ? 'invoice' : 'card'
      });

      if (paymentOption === 'invoice') {
        setStatus('success');

        window.setTimeout(() => {
          onClose();
        }, 1400);

        return;
      }

      const paymentResponse = await api.post('/api/v1/payments/init', {
        registrationId: registrationResponse.data.registrationId,
        provider: getProviderFromPaymentOption(paymentOption)
      });

      window.location.href = paymentResponse.data.checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration could not be completed.');
      setStatus('idle');
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="registration-title">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close registration form">
          ×
        </button>

        <p className="eyebrow">Course registration</p>
        <h2 id="registration-title">{course.title}</h2>
        <p className="muted">{course.dateLabel}</p>

        <form onSubmit={handleSubmit} className="registration-form" noValidate>
          <div className="form-grid two-columns">
            <label>
              First name
              <input
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                autoComplete="given-name"
                required
                aria-invalid={Boolean(fieldErrors.firstName)}
              />
              {fieldErrors.firstName && <small className="field-error">{fieldErrors.firstName}</small>}
            </label>

            <label>
              Last name
              <input
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                autoComplete="family-name"
                required
                aria-invalid={Boolean(fieldErrors.lastName)}
              />
              {fieldErrors.lastName && <small className="field-error">{fieldErrors.lastName}</small>}
            </label>
          </div>

          <label>
            Email address
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
          </label>

          <div className="form-grid two-columns">
            <label>
              Phone number
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                placeholder="+2348137617995"
                pattern={phonePattern}
                autoComplete="tel"
                required
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              <small>Use international format, for example +2348137617995.</small>
              {fieldErrors.phone && <small className="field-error">{fieldErrors.phone}</small>}
            </label>

            <label>
              WhatsApp number
              <input
                name="whatsapp"
                type="tel"
                value={form.whatsapp}
                onChange={updateField}
                placeholder="+2348137617995"
                pattern={phonePattern}
                autoComplete="tel"
                aria-invalid={Boolean(fieldErrors.whatsapp)}
              />
              <small>Leave blank if it is the same as your phone number.</small>
              {fieldErrors.whatsapp && <small className="field-error">{fieldErrors.whatsapp}</small>}
            </label>
          </div>

          <label>
            Country
            <select
              name="country"
              value={form.country}
              onChange={updateField}
              required
              aria-invalid={Boolean(fieldErrors.country)}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {fieldErrors.country && <small className="field-error">{fieldErrors.country}</small>}
          </label>

          <div className="form-grid two-columns">
            <label>
              Organization / affiliation (optional)
              <input name="organization" value={form.organization} onChange={updateField} />
            </label>

            <label>
              Job title / role (optional)
              <input name="jobTitle" value={form.jobTitle} onChange={updateField} />
            </label>
          </div>

          <label>
            How did you hear about this course?
            <select name="howHeard" value={form.howHeard} onChange={updateField}>
              <option value="">Select one</option>
              <option value="Cloneshouse email">Cloneshouse email</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Colleague or friend">Colleague or friend</option>
              <option value="Search engine">Search engine</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <fieldset className="payment-fieldset">
            <legend>Payment option</legend>

            <div className="payment-choice-list">
              {paymentOptions.map((option) => {
                const isSelected = paymentOption === option.value;

                return (
                  <label
                    key={option.value}
                    className={`payment-choice-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      value={option.value}
                      checked={isSelected}
                      onChange={(event) => setPaymentOption(event.target.value)}
                    />

                    <span className="payment-choice-content">
                      <span className="payment-choice-tag">{option.tag}</span>
                      <span className="payment-choice-title">{option.title}</span>
                      <span className="payment-choice-description">{option.description}</span>
                    </span>

                    <span className="payment-choice-arrow" aria-hidden="true">
                      ›
                    </span>
                  </label>
                );
              })}
            </div>

            <small className="payment-helper">
              Payments are processed through secure third-party checkout pages. Cloneshouse does not store card details.
            </small>
          </fieldset>

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="communicationConsent"
              checked={form.communicationConsent}
              onChange={updateField}
            />
            I agree to receive course updates, reminders, and follow-up messages by email and WhatsApp.
          </label>

          {error && <p className="form-error">{error}</p>}

          {status === 'success' && (
            <div className="form-success">
              Thank you. Your registration has been received. This form will close automatically.
            </div>
          )}

          <button className="button button-primary" type="submit" disabled={status === 'loading' || status === 'success'}>
            {status === 'loading'
              ? 'Processing…'
              : paymentOption === 'invoice'
                ? 'Submit registration request'
                : `Continue to secure payment · ${formatCurrency(getActivePrice(course))}`}
          </button>
        </form>
      </div>
    </div>
  );
}