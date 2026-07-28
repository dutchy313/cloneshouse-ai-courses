import { Course } from '../models/Course.js';

export async function getCourses(req, res, next) {
  try {
    const courses = await Course.find({ isActive: true }).sort({ earlyBirdEndsAt: 1 });

    res.json({
      courses
    });
  } catch (error) {
    next(error);
  }
}