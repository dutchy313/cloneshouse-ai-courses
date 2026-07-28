export function getCoursePriceUsd(course, now = new Date()) {
  const earlyBirdEndsAt = new Date(course.earlyBirdEndsAt);

  if (Number.isNaN(earlyBirdEndsAt.getTime())) {
    return course.standardPriceUsd;
  }

  return now <= earlyBirdEndsAt ? course.earlyBirdPriceUsd : course.standardPriceUsd;
}
