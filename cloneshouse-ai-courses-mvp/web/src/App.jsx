import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import { CourseCard } from './components/CourseCard.jsx';
import { RegistrationModal } from './components/RegistrationModal.jsx';
import './styles.css';

const SUPPORT_EMAIL = 'foundation@cloneshouse.com';
const SUPPORT_WHATSAPP_DISPLAY = '+234 813 761 7995';
const SUPPORT_WHATSAPP_LINK =
  'https://wa.me/2348137617995?text=Hello%20Cloneshouse%2C%20I%20need%20help%20with%20my%20AI%20course%20registration.';

function getProviderLabel(provider) {
  if (provider === 'squad') {
    return 'Squad';
  }

  if (provider === 'paystack') {
    return 'Paystack';
  }

  return 'secure checkout';
}

function formatCurrency(amount) {
  return `US$${Number(amount).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`;
}

function PaymentSuccessPanel({ provider, reference, isMock }) {
  const [verificationStatus, setVerificationStatus] = useState('checking');
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function checkPaymentStatus() {
      if (!reference) {
        setVerificationStatus('missing-reference');
        return;
      }

      try {
        const response = await api.get(`/api/v1/payments/status/${reference}`);
        const payment = response.data.payment;

        if (cancelled) return;

        setPaymentDetails(payment);

        if (payment.status === 'paid') {
          setVerificationStatus('paid');
          return;
        }

        if (payment.status === 'failed') {
          setVerificationStatus('failed');
          return;
        }

        attempts += 1;

        if (attempts >= 8) {
          setVerificationStatus('pending');
          return;
        }

        window.setTimeout(checkPaymentStatus, 3000);
      } catch {
        if (cancelled) return;

        attempts += 1;

        if (attempts >= 4) {
          setVerificationStatus('could-not-verify');
          return;
        }

        window.setTimeout(checkPaymentStatus, 3000);
      }
    }

    checkPaymentStatus();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  const displayProvider = paymentDetails?.provider || provider;
  const displayReference = paymentDetails?.reference || reference;

  return (
    <section className="payment-success-panel" aria-labelledby="payment-success-title">
      <div className={`payment-success-mark payment-success-mark-${verificationStatus}`} aria-hidden="true">
        {verificationStatus === 'paid' ? '✓' : verificationStatus === 'failed' ? '!' : '…'}
      </div>

      <div className="payment-success-copy">
        <p className="eyebrow">Payment status</p>

        {verificationStatus === 'checking' && (
          <>
            <h1 id="payment-success-title">Checking your payment confirmation.</h1>
            <p>
              Your payment through <strong>{getProviderLabel(displayProvider)}</strong> has returned to Cloneshouse.
              We are checking the payment record securely.
            </p>
          </>
        )}

        {verificationStatus === 'paid' && (
          <>
            <h1 id="payment-success-title">Payment confirmed. Thank you.</h1>
            <p>
              Your payment through <strong>{getProviderLabel(displayProvider)}</strong> has been confirmed
              {displayReference ? (
                <>
                  {' '}
                  with reference <strong>{displayReference}</strong>
                </>
              ) : null}
              . The Cloneshouse team will complete your course admission and send your Zoom details by email.
            </p>

            {paymentDetails?.amountUsd && (
              <div className="payment-summary-card">
                <span>Amount paid</span>
                <strong>
                  {formatCurrency(paymentDetails.amountUsd)} {paymentDetails.currency}
                </strong>
              </div>
            )}

            {paymentDetails?.courseTitle && (
              <div className="payment-summary-card">
                <span>Course</span>
                <strong>{paymentDetails.courseTitle}</strong>
              </div>
            )}
          </>
        )}

        {verificationStatus === 'pending' && (
          <>
            <h1 id="payment-success-title">Payment is still being verified.</h1>
            <p>
              Your checkout was completed, but the payment provider webhook may still be processing.
              Please wait a few minutes and check your email. Your reference is{' '}
              <strong>{displayReference}</strong>.
            </p>
          </>
        )}

        {verificationStatus === 'failed' && (
          <>
            <h1 id="payment-success-title">Payment was not completed.</h1>
            <p>
              We found your payment record, but it is marked as failed. You can try again or contact Cloneshouse
              support with reference <strong>{displayReference}</strong>.
            </p>
          </>
        )}

        {verificationStatus === 'could-not-verify' && (
          <>
            <h1 id="payment-success-title">We could not verify the payment yet.</h1>
            <p>
              Your checkout redirected back to Cloneshouse, but we could not confirm the payment status immediately.
              Please contact support with reference <strong>{displayReference}</strong>.
            </p>
          </>
        )}

        {verificationStatus === 'missing-reference' && (
          <>
            <h1 id="payment-success-title">Payment reference is missing.</h1>
            <p>
              We could not find a payment reference in the return link. Please contact Cloneshouse support for help.
            </p>
          </>
        )}

        {isMock && (
          <div className="payment-success-note">
            This was a local mock payment confirmation for development testing.
          </div>
        )}

        <div className="payment-next-steps">
          <h2>What happens next</h2>

          <ol>
            <li>Your payment is verified securely by the payment provider.</li>
            <li>Your registration is marked as paid in the Cloneshouse course records.</li>
            <li>Your Zoom admission details will be sent by email.</li>
            <li>You will receive course reminders before the live session.</li>
          </ol>
        </div>

        <div className="payment-help-box">
          <h2>Need help?</h2>
          <p>
            Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or reach out on WhatsApp at{' '}
            <a href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
              {SUPPORT_WHATSAPP_DISPLAY}
            </a>
            .
          </p>
        </div>

        <div className="payment-success-actions">
          <a className="button button-primary" href="#courses">
            View courses
          </a>
          <a className="button button-secondary" href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
            Message us on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [pageMessage, setPageMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    async function loadCourses() {
      const response = await api.get('/api/v1/courses');
      setCourses(response.data.courses);
    }

    loadCourses().catch(() => {
      setPageMessage('Courses could not be loaded. Please refresh the page.');
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const provider = params.get('provider');
    const mock = params.get('mock');

    async function handlePaymentReturn() {
      if (!reference) return;

      if (mock === 'true') {
        await api.post('/api/v1/payments/mock-confirm', {
          reference,
          provider: provider || 'paystack'
        });
      }

      setPaymentSuccess({
        reference,
        provider,
        isMock: mock === 'true'
      });

      window.history.replaceState({}, '', '/');
    }

    handlePaymentReturn().catch(() => {
      setPageMessage(
        `Payment was received, but local confirmation failed. Please contact ${SUPPORT_EMAIL} or WhatsApp ${SUPPORT_WHATSAPP_DISPLAY}.`
      );
    });
  }, []);

  const augustCourse = courses.find((course) => course.slug === 'custom-gpts-for-evaluators');
  const septemberCourse = courses.find((course) => course.slug === 'ai-agents-for-evaluators');

  return (
    <>
      <header className="site-header">
        <a className="brand" href="/">
          <img src="https://www.cloneshouse.com/wp-content/uploads/2025/03/cloneshouse_logo_320px.png" alt="Cloneshouse" />
        </a>

        <div className="header-right">
          <nav>
            <a href="#courses">Courses</a>
            <a href="#register">Register</a>
            <a href="#faq">FAQ</a>
          </nav>

          <a className="header-contact" href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
            <span aria-hidden="true">☎</span>
            <span>WhatsApp</span>
          </a>
        </div>
      </header>

      <main>
        {pageMessage && <div className="page-message">{pageMessage}</div>}

        {paymentSuccess && (
          <PaymentSuccessPanel
            provider={paymentSuccess.provider}
            reference={paymentSuccess.reference}
            isMock={paymentSuccess.isMock}
          />
        )}

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">AI for Monitoring, Evaluation and Learning</p>
            <h1>AI courses for evaluators who work with evidence.</h1>
            <p className="hero-text">
              Practical online masterclasses from Cloneshouse for MEL professionals, researchers,
              consultants, programme managers, and development practitioners who want to use AI
              responsibly in real evaluation workflows.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#courses">
                View upcoming courses
              </a>
              <a className="button button-secondary" href="#register">
                Register now
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Cloneshouse AI course pathway">
            <img
              src="https://images.unsplash.com/photo-1573497491208-6b1acb260507?auto=format&fit=crop&w=1200&q=80"
              alt="Black professionals collaborating during a practical learning session"
            />
            <div className="pathway-card">
              <div className="panel-row">
                <span>Step 01</span>
                <strong>Build your evaluation assistant</strong>
              </div>
              <div className="panel-row">
                <span>Step 02</span>
                <strong>Build your evaluation workflow</strong>
              </div>
              <div className="panel-note">
                Human review stays at the centre: verify, document, and improve every AI-assisted output.
              </div>
            </div>
            <p className="image-credit">Photo via Unsplash</p>
          </div>
        </section>

        <section className="section" id="courses">
          <div className="section-heading">
            <p className="eyebrow">Upcoming live courses</p>
            <h2>Start with Custom GPTs. Continue with AI agents.</h2>
          </div>

          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} onRegister={setSelectedCourse} />
            ))}
          </div>
        </section>

        <section className="section split-section">
          <div>
            <p className="eyebrow">Why this matters</p>
            <h2>Generic AI is not enough for evaluation work.</h2>
          </div>
          <p>
            Evaluation work requires evidence, context, caution, and professional judgement. These
            courses help you move from casual AI use to structured tools that support design,
            analysis, reporting, learning, and follow-up without replacing human validation.
          </p>
        </section>

        <section className="section learning-list">
          <p className="eyebrow">What you will learn</p>
          <div className="pill-grid">
            <span>Custom GPT design</span>
            <span>No-code AI agents</span>
            <span>M&E workflow mapping</span>
            <span>Prompt instructions</span>
            <span>Evidence verification</span>
            <span>Bias and hallucination checks</span>
            <span>Data privacy safeguards</span>
            <span>Reporting support</span>
          </div>
        </section>

        <section className="section" id="register">
          <div className="section-heading">
            <p className="eyebrow">Register</p>
            <h2>Choose your course and continue to secure payment.</h2>
          </div>

          <div className="register-options">
            <button className="register-option" onClick={() => augustCourse && setSelectedCourse(augustCourse)}>
              <span>August course</span>
              <strong>Register for Custom GPTs</strong>
            </button>

            <button className="register-option" onClick={() => septemberCourse && setSelectedCourse(septemberCourse)}>
              <span>September course</span>
              <strong>Register for AI Agents</strong>
            </button>

            <a
              className="register-option"
              href={`mailto:${SUPPORT_EMAIL}?subject=Team registration for Cloneshouse AI courses`}
            >
              <span>Team registration</span>
              <strong>Request invoice / group support</strong>
            </a>
          </div>

          <div className="steps">
            <div>Choose your course</div>
            <div>Complete the registration form</div>
            <div>Pay online in USD</div>
            <div>Receive Zoom details by email</div>
            <div>Attend the live masterclass</div>
            <div>Get follow-up resources</div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Quick answers before you register.</h2>
          </div>

          <div className="faq-grid">
            <article>
              <h3>Do I need coding experience?</h3>
              <p>No. These courses are designed around practical, no-code AI workflows.</p>
            </article>
            <article>
              <h3>Are the courses live?</h3>
              <p>Yes. Both sessions are live online masterclasses delivered on Zoom.</p>
            </article>
            <article>
              <h3>What currency is used?</h3>
              <p>
                Registration is priced in USD. The August course is US$120 standard / US$100 early bird.
                The September course is US$250 standard / US$200 early bird.
              </p>
            </article>
            <article>
              <h3>Can an organization register a team?</h3>
              <p>Yes. Use the team registration option to request invoice or group support.</p>
            </article>
          </div>
        </section>

        <section className="section policy-section" id="policies">
          <div className="section-heading">
            <p className="eyebrow">Policies and support</p>
            <h2>Clear terms before you register.</h2>
          </div>

          <div className="policy-grid">
            <article className="policy-card">
              <span>Privacy</span>
              <h3>Your registration data is used only for course delivery.</h3>
              <p>
                We collect registration details to manage your course registration, payment confirmation,
                Zoom admission, reminders, and learner support. Cloneshouse does not store card details.
                Online payments are processed by secure third-party payment providers.
              </p>
            </article>

            <article className="policy-card">
              <span>Refunds and cancellation</span>
              <h3>Contact us early if your plans change.</h3>
              <p>
                If you cannot attend after payment, contact Cloneshouse at least 7 days before the live
                session. Refund or transfer requests are reviewed by the Cloneshouse team. Payment processor
                charges may be non-refundable.
              </p>
            </article>

            <article className="policy-card">
              <span>Course access</span>
              <h3>Use the same email address throughout registration.</h3>
              <p>
                Zoom admission details are sent after payment confirmation. Please use the same email address
                for registration, payment, and course access so your admission can be matched correctly.
              </p>
            </article>

            <article className="policy-card policy-contact-card">
              <span>Need help?</span>
              <h3>Reach Cloneshouse support.</h3>
              <p>
                Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or WhatsApp{' '}
                <a href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
                  {SUPPORT_WHATSAPP_DISPLAY}
                </a>
                .
              </p>
            </article>
          </div>
        </section>

        <section className="final-cta">
          <p className="eyebrow">Cloneshouse AI for Evaluators</p>
          <h2>Move from using AI casually to building reliable AI tools for evaluation work.</h2>
          <a className="button button-primary" href="#register">
            Register for a course
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <strong>Cloneshouse</strong>
        <p>AI courses for Monitoring, Evaluation, Research, Learning, and Development Practice.</p>
        <p>
          Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or WhatsApp{' '}
          <a href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
            {SUPPORT_WHATSAPP_DISPLAY}
          </a>
          .
        </p>
        <small>© {new Date().getFullYear()} Cloneshouse. All rights reserved.</small>
      </footer>

      <RegistrationModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </>
  );
}