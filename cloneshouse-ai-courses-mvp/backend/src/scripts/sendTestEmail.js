import { sendTestEmail, verifyEmailTransport } from '../services/email.service.js';

const recipient = process.argv[2];

if (!recipient) {
  console.error('Please provide a recipient email address.');
  console.error('Example: npm run email:test -- you@example.com');
  process.exit(1);
}

async function main() {
  await verifyEmailTransport();

  const result = await sendTestEmail({
    to: recipient
  });

  console.log('Test email result:', result);
  process.exit(0);
}

main().catch((error) => {
  console.error('Test email failed:', error.message);
  process.exit(1);
});