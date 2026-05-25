export class BaseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION_ERROR", message, 400, cause);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = "Unauthorized", cause?: unknown) {
    super("UNAUTHORIZED", message, 401, cause);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = "Forbidden", cause?: unknown) {
    super("FORBIDDEN", message, 403, cause);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = "Not found", cause?: unknown) {
    super("NOT_FOUND", message, 404, cause);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = "Conflict", cause?: unknown) {
    super("CONFLICT", message, 409, cause);
  }
}
