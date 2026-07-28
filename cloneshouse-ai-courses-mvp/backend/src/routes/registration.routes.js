import { Router } from 'express';
import { createRegistration } from '../controllers/registration.controller.js';

export const registrationRouter = Router();

registrationRouter.post('/', createRegistration);