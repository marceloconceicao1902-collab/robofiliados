export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    const ErrorAny = Error as any;
    if (typeof ErrorAny.captureStackTrace === 'function') {
      ErrorAny.captureStackTrace(this);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class AffiliateApiError extends AppError {
  public readonly platform: string;
  public readonly rawError?: unknown;

  constructor(message: string, platform: string, rawError?: unknown, statusCode = 502) {
    super(message, statusCode);
    this.name = 'AffiliateApiError';
    this.platform = platform;
    this.rawError = rawError;
  }
}

export class WhatsAppServiceError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(message, statusCode);
    this.name = 'WhatsAppServiceError';
  }
}

export class DuplicateProductError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'DuplicateProductError';
  }
}
