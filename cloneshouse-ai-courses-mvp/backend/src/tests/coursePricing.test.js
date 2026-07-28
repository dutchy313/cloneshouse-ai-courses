import { describe, expect, it } from 'vitest';
import { getCoursePriceUsd } from '../services/pricing.service.js';

describe('Course pricing', () => {
  const course = {
    standardPriceUsd: 120,
    earlyBirdPriceUsd: 100,
    earlyBirdEndsAt: new Date('2026-08-06T16:00:00.000Z')
  };

  it('keeps early bird price lower than standard price', () => {
    expect(course.earlyBirdPriceUsd).toBeLessThan(course.standardPriceUsd);
  });

  it('uses early bird price before the early bird deadline', () => {
    const price = getCoursePriceUsd(course, new Date('2026-08-01T12:00:00.000Z'));

    expect(price).toBe(100);
  });

  it('uses standard price after the early bird deadline', () => {
    const price = getCoursePriceUsd(course, new Date('2026-08-07T12:00:00.000Z'));

    expect(price).toBe(120);
  });
});
