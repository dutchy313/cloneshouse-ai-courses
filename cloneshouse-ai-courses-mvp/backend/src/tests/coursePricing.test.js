import { describe, expect, it } from 'vitest';
import {
  getCoursePriceByCurrency,
  getCoursePriceNgn,
  getCoursePriceUsd,
  isEarlyBirdActive
} from '../services/pricing.service.js';

describe('Course pricing', () => {
  const course = {
    standardPriceUsd: 120,
    earlyBirdPriceUsd: 100,
    standardPriceNgn: 163000,
    earlyBirdPriceNgn: 140000,
    earlyBirdEndsAt: new Date('2026-08-06T16:00:00.000Z')
  };

  it('keeps early bird USD price lower than standard USD price', () => {
    expect(course.earlyBirdPriceUsd).toBeLessThan(course.standardPriceUsd);
  });

  it('keeps early bird NGN price lower than standard NGN price', () => {
    expect(course.earlyBirdPriceNgn).toBeLessThan(course.standardPriceNgn);
  });

  it('detects active early bird period before the deadline', () => {
    const active = isEarlyBirdActive(course, new Date('2026-08-01T12:00:00.000Z'));

    expect(active).toBe(true);
  });

  it('detects inactive early bird period after the deadline', () => {
    const active = isEarlyBirdActive(course, new Date('2026-08-07T12:00:00.000Z'));

    expect(active).toBe(false);
  });

  it('uses USD early bird price before the early bird deadline', () => {
    const price = getCoursePriceUsd(course, new Date('2026-08-01T12:00:00.000Z'));

    expect(price).toBe(100);
  });

  it('uses USD standard price after the early bird deadline', () => {
    const price = getCoursePriceUsd(course, new Date('2026-08-07T12:00:00.000Z'));

    expect(price).toBe(120);
  });

  it('uses NGN early bird price before the early bird deadline', () => {
    const price = getCoursePriceNgn(course, new Date('2026-08-01T12:00:00.000Z'));

    expect(price).toBe(140000);
  });

  it('uses NGN standard price after the early bird deadline', () => {
    const price = getCoursePriceNgn(course, new Date('2026-08-07T12:00:00.000Z'));

    expect(price).toBe(163000);
  });

  it('selects price by USD currency', () => {
    const price = getCoursePriceByCurrency(course, 'USD', new Date('2026-08-01T12:00:00.000Z'));

    expect(price).toBe(100);
  });

  it('selects price by NGN currency', () => {
    const price = getCoursePriceByCurrency(course, 'NGN', new Date('2026-08-01T12:00:00.000Z'));

    expect(price).toBe(140000);
  });
});