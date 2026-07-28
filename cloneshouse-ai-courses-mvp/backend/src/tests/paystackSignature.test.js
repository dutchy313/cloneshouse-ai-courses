import { describe, expect, it } from 'vitest';
import crypto from 'crypto';

describe('Paystack signature idea', () => {
  it('creates a sha512 HMAC signature from the raw body and secret', () => {
    const secret = 'test-secret';
    const rawBody = JSON.stringify({ event: 'charge.success' });

    const signature = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    expect(signature).toHaveLength(128);
  });
});
