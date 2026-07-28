import { ZodError } from 'zod';

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.issues
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: 'This registration already exists'
    });
  }

  res.status(500).json({
    message: error.message || 'Something went wrong'
  });
}
