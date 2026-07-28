import { Router } from 'express';
import { getCourses } from '../controllers/course.controller.js';

export const courseRouter = Router();

courseRouter.get('/', getCourses);