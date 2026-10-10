export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'ILLEGAL_TRANSITION'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL';

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, any>;

  constructor(code: ErrorCode, message: string, statusCode: number, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function unauthenticated(message = 'Authentication required'): AppError {
  return new AppError('UNAUTHENTICATED', message, 401);
}

export function forbidden(message = 'Access forbidden'): AppError {
  return new AppError('FORBIDDEN', message, 403);
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError('NOT_FOUND', message, 404);
}

export function validationError(message: string, details?: Record<string, any>): AppError {
  return new AppError('VALIDATION_ERROR', message, 422, details);
}

export function illegalTransition(message: string): AppError {
  return new AppError('ILLEGAL_TRANSITION', message, 409);
}

export function conflict(message: string): AppError {
  return new AppError('CONFLICT', message, 409);
}

export function payloadTooLarge(message: string): AppError {
  return new AppError('PAYLOAD_TOO_LARGE', message, 413);
}

export function internalError(message = 'Internal server error'): AppError {
  return new AppError('INTERNAL', message, 500);
}
