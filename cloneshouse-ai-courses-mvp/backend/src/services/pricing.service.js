export function isEarlyBirdActive(course, now = new Date()) {
  const earlyBirdEndsAt = new Date(course.earlyBirdEndsAt);

  if (Number.isNaN(earlyBirdEndsAt.getTime())) {
    return false;
  }

  return now <= earlyBirdEndsAt;
}

export function getCoursePriceUsd(course, now = new Date()) {
  return isEarlyBirdActive(course, now) ? course.earlyBirdPriceUsd : course.standardPriceUsd;
}

export function getCoursePriceNgn(course, now = new Date()) {
  return isEarlyBirdActive(course, now) ? course.earlyBirdPriceNgn : course.standardPriceNgn;
}

export function getCoursePriceByCurrency(course, currency = 'USD', now = new Date()) {
  if (currency === 'NGN') {
    return getCoursePriceNgn(course, now);
  }

  return getCoursePriceUsd(course, now);
}