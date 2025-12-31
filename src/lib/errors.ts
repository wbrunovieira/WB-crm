/**
 * Custom Error Classes for WB-CRM
 * Phase 9: Architecture Improvements - Error Handling
 *
 * Provides standardized error classes with:
 * - Consistent status codes
 * - Portuguese messages (pt-BR)
 * - Type guards for error identification
 * - Response formatting utilities
 */

/**
 * Base class for all application errors
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts error to a JSON-serializable object for API responses
   */
  toJSON(): { error: string; code: string; statusCode: number } {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }

  /**
   * Creates a Response object for API routes
   */
  toResponse(): Response {
    return Response.json(this.toJSON(), { status: this.statusCode });
  }
}

/**
 * 404 Not Found - Resource does not exist or user doesn't have access
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";
  readonly resourceType?: string;

  constructor(message?: string, resourceType?: string) {
    super(message || "Recurso não encontrado");
    this.resourceType = resourceType;
  }

  static forResource(resourceType: string, id?: string): NotFoundError {
    const resourceNames: Record<string, string> = {
      deal: "Negócio",
      contact: "Contato",
      lead: "Lead",
      organization: "Organização",
      activity: "Atividade",
      partner: "Parceiro",
      pipeline: "Pipeline",
      stage: "Etapa",
      product: "Produto",
      label: "Etiqueta",
    };

    const name = resourceNames[resourceType] || resourceType;
    const message = id
      ? `${name} não encontrado(a)`
      : `${name} não encontrado(a)`;

    return new NotFoundError(message, resourceType);
  }
}

/**
 * 401 Unauthorized - User is not authenticated
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message?: string) {
    super(message || "Não autorizado");
  }
}

/**
 * 403 Forbidden - User is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor(message?: string) {
    super(message || "Acesso negado");
  }

  static forResource(resourceType: string): ForbiddenError {
    const resourceNames: Record<string, string> = {
      deal: "este negócio",
      contact: "este contato",
      lead: "este lead",
      organization: "esta organização",
      activity: "esta atividade",
      partner: "este parceiro",
      admin: "a área administrativa",
    };

    const name = resourceNames[resourceType] || resourceType;
    return new ForbiddenError(`Você não tem permissão para acessar ${name}`);
  }
}

/**
 * 400 Bad Request - Validation error
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
  readonly fields?: Record<string, string[]>;

  constructor(message?: string, fields?: Record<string, string[]>) {
    super(message || "Dados inválidos");
    this.fields = fields;
  }

  toJSON(): {
    error: string;
    code: string;
    statusCode: number;
    fields?: Record<string, string[]>;
  } {
    const base = super.toJSON();
    if (this.fields) {
      return { ...base, fields: this.fields };
    }
    return base;
  }

  /**
   * Creates a ValidationError from Zod error
   */
  static fromZodError(zodError: {
    errors: Array<{ path: (string | number)[]; message: string }>;
  }): ValidationError {
    const fields: Record<string, string[]> = {};

    for (const error of zodError.errors) {
      const path = error.path.join(".");
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(error.message);
    }

    return new ValidationError("Dados inválidos", fields);
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";
  readonly conflictField?: string;

  constructor(message?: string, conflictField?: string) {
    super(message || "Conflito de dados");
    this.conflictField = conflictField;
  }

  static forDuplicate(field: string, value?: string): ConflictError {
    const fieldNames: Record<string, string> = {
      email: "Email",
      name: "Nome",
      slug: "Slug",
      code: "Código",
    };

    const name = fieldNames[field] || field;
    const message = value
      ? `${name} "${value}" já existe`
      : `${name} já existe`;

    return new ConflictError(message, field);
  }
}

/**
 * 500 Internal Server Error - Unexpected error
 */
export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code = "INTERNAL_ERROR";

  constructor(message?: string) {
    super(message || "Erro interno do servidor");
  }
}

// ==================== Type Guards ====================

/**
 * Checks if an error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Checks if an error is a NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Checks if an error is an UnauthorizedError
 */
export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Checks if an error is a ForbiddenError
 */
export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

/**
 * Checks if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Checks if an error is a ConflictError
 */
export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

// ==================== Utilities ====================

/**
 * Converts any error to an appropriate Response
 * In production, hides internal error details
 */
export function errorToResponse(
  error: unknown,
  options?: { includeStack?: boolean }
): Response {
  if (isAppError(error)) {
    return error.toResponse();
  }

  // For non-AppError, return a generic 500 error
  const isProd = process.env.NODE_ENV === "production";
  const message = isProd ? "Erro interno do servidor" : (error as Error).message;

  const body: { error: string; statusCode: number; stack?: string } = {
    error: message,
    statusCode: 500,
  };

  // Only include stack in development if requested
  if (!isProd && options?.includeStack && error instanceof Error) {
    body.stack = error.stack;
  }

  return Response.json(body, { status: 500 });
}

/**
 * Wraps an async function and converts errors to appropriate responses
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | Response> {
  return async (...args: T): Promise<R | Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorToResponse(error);
    }
  };
}
