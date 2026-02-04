/**
 * Tests for Custom Error Classes
 * Phase 9: Architecture Improvements - Error Handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  InternalError,
  isAppError,
  isNotFoundError,
  isUnauthorizedError,
  isForbiddenError,
  isValidationError,
  isConflictError,
  errorToResponse,
  withErrorHandling,
} from "@/lib/errors";

describe("Error Classes", () => {
  // ==================== NotFoundError ====================
  describe("NotFoundError", () => {
    it("should have correct properties", () => {
      const error = new NotFoundError();

      expect(error.name).toBe("NotFoundError");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Recurso não encontrado");
    });

    it("should have default message in Portuguese", () => {
      const error = new NotFoundError();

      expect(error.message).toBe("Recurso não encontrado");
    });

    it("should accept custom message", () => {
      const error = new NotFoundError("Negócio não existe");

      expect(error.message).toBe("Negócio não existe");
    });

    it("should accept resource type", () => {
      const error = new NotFoundError("Deal not found", "deal");

      expect(error.resourceType).toBe("deal");
    });

    it("should create error for specific resource types", () => {
      const dealError = NotFoundError.forResource("deal");
      expect(dealError.message).toBe("Negócio não encontrado(a)");
      expect(dealError.resourceType).toBe("deal");

      const contactError = NotFoundError.forResource("contact");
      expect(contactError.message).toBe("Contato não encontrado(a)");

      const leadError = NotFoundError.forResource("lead");
      expect(leadError.message).toBe("Lead não encontrado(a)");

      const orgError = NotFoundError.forResource("organization");
      expect(orgError.message).toBe("Organização não encontrado(a)");
    });

    it("should be an instance of Error and AppError", () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  // ==================== UnauthorizedError ====================
  describe("UnauthorizedError", () => {
    it("should have correct properties", () => {
      const error = new UnauthorizedError();

      expect(error.name).toBe("UnauthorizedError");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe("Não autorizado");
    });

    it("should have default message in Portuguese", () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe("Não autorizado");
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedError("Sessão expirada");

      expect(error.message).toBe("Sessão expirada");
    });
  });

  // ==================== ForbiddenError ====================
  describe("ForbiddenError", () => {
    it("should have correct properties", () => {
      const error = new ForbiddenError();

      expect(error.name).toBe("ForbiddenError");
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe("Acesso negado");
    });

    it("should have default message in Portuguese", () => {
      const error = new ForbiddenError();

      expect(error.message).toBe("Acesso negado");
    });

    it("should accept custom message", () => {
      const error = new ForbiddenError("Apenas administradores");

      expect(error.message).toBe("Apenas administradores");
    });

    it("should create error for specific resource types", () => {
      const dealError = ForbiddenError.forResource("deal");
      expect(dealError.message).toBe("Você não tem permissão para acessar este negócio");

      const adminError = ForbiddenError.forResource("admin");
      expect(adminError.message).toBe("Você não tem permissão para acessar a área administrativa");
    });
  });

  // ==================== ValidationError ====================
  describe("ValidationError", () => {
    it("should have correct properties", () => {
      const error = new ValidationError();

      expect(error.name).toBe("ValidationError");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Dados inválidos");
    });

    it("should have default message in Portuguese", () => {
      const error = new ValidationError();

      expect(error.message).toBe("Dados inválidos");
    });

    it("should accept custom message", () => {
      const error = new ValidationError("Email inválido");

      expect(error.message).toBe("Email inválido");
    });

    it("should include field errors", () => {
      const fields = {
        email: ["Email inválido", "Email é obrigatório"],
        name: ["Nome muito curto"],
      };
      const error = new ValidationError("Dados inválidos", fields);

      expect(error.fields).toEqual(fields);
    });

    it("should include fields in toJSON output", () => {
      const fields = { email: ["Email inválido"] };
      const error = new ValidationError("Dados inválidos", fields);

      const json = error.toJSON();

      expect(json.fields).toEqual(fields);
    });

    it("should create from Zod error", () => {
      const zodError = {
        errors: [
          { path: ["email"], message: "Email inválido" },
          { path: ["email"], message: "Email é obrigatório" },
          { path: ["name"], message: "Nome muito curto" },
          { path: ["address", "city"], message: "Cidade é obrigatória" },
        ],
      };

      const error = ValidationError.fromZodError(zodError);

      expect(error.message).toBe("Dados inválidos");
      expect(error.fields).toEqual({
        email: ["Email inválido", "Email é obrigatório"],
        name: ["Nome muito curto"],
        "address.city": ["Cidade é obrigatória"],
      });
    });
  });

  // ==================== ConflictError ====================
  describe("ConflictError", () => {
    it("should have correct properties", () => {
      const error = new ConflictError();

      expect(error.name).toBe("ConflictError");
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
      expect(error.message).toBe("Conflito de dados");
    });

    it("should have default message in Portuguese", () => {
      const error = new ConflictError();

      expect(error.message).toBe("Conflito de dados");
    });

    it("should accept custom message", () => {
      const error = new ConflictError("Email já cadastrado");

      expect(error.message).toBe("Email já cadastrado");
    });

    it("should accept conflict field", () => {
      const error = new ConflictError("Email já existe", "email");

      expect(error.conflictField).toBe("email");
    });

    it("should create for duplicate field", () => {
      const error = ConflictError.forDuplicate("email", "test@example.com");

      expect(error.message).toBe('Email "test@example.com" já existe');
      expect(error.conflictField).toBe("email");
    });

    it("should create for duplicate field without value", () => {
      const error = ConflictError.forDuplicate("name");

      expect(error.message).toBe("Nome já existe");
      expect(error.conflictField).toBe("name");
    });
  });

  // ==================== InternalError ====================
  describe("InternalError", () => {
    it("should have correct properties", () => {
      const error = new InternalError();

      expect(error.name).toBe("InternalError");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.message).toBe("Erro interno do servidor");
    });

    it("should have default message in Portuguese", () => {
      const error = new InternalError();

      expect(error.message).toBe("Erro interno do servidor");
    });

    it("should accept custom message", () => {
      const error = new InternalError("Falha na conexão com banco de dados");

      expect(error.message).toBe("Falha na conexão com banco de dados");
    });
  });
});

describe("Type Guards", () => {
  describe("isAppError", () => {
    it("should identify custom errors as AppError", () => {
      expect(isAppError(new NotFoundError())).toBe(true);
      expect(isAppError(new UnauthorizedError())).toBe(true);
      expect(isAppError(new ForbiddenError())).toBe(true);
      expect(isAppError(new ValidationError())).toBe(true);
      expect(isAppError(new ConflictError())).toBe(true);
      expect(isAppError(new InternalError())).toBe(true);
    });

    it("should reject generic Error", () => {
      expect(isAppError(new Error("test"))).toBe(false);
    });

    it("should reject non-Error objects", () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError("error")).toBe(false);
      expect(isAppError({ message: "error" })).toBe(false);
    });
  });

  describe("isNotFoundError", () => {
    it("should identify NotFoundError", () => {
      expect(isNotFoundError(new NotFoundError())).toBe(true);
    });

    it("should reject other AppErrors", () => {
      expect(isNotFoundError(new UnauthorizedError())).toBe(false);
      expect(isNotFoundError(new ForbiddenError())).toBe(false);
    });
  });

  describe("isUnauthorizedError", () => {
    it("should identify UnauthorizedError", () => {
      expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
    });

    it("should reject other AppErrors", () => {
      expect(isUnauthorizedError(new NotFoundError())).toBe(false);
    });
  });

  describe("isForbiddenError", () => {
    it("should identify ForbiddenError", () => {
      expect(isForbiddenError(new ForbiddenError())).toBe(true);
    });

    it("should reject other AppErrors", () => {
      expect(isForbiddenError(new NotFoundError())).toBe(false);
    });
  });

  describe("isValidationError", () => {
    it("should identify ValidationError", () => {
      expect(isValidationError(new ValidationError())).toBe(true);
    });

    it("should reject other AppErrors", () => {
      expect(isValidationError(new NotFoundError())).toBe(false);
    });
  });

  describe("isConflictError", () => {
    it("should identify ConflictError", () => {
      expect(isConflictError(new ConflictError())).toBe(true);
    });

    it("should reject other AppErrors", () => {
      expect(isConflictError(new NotFoundError())).toBe(false);
    });
  });
});

describe("Response Utilities", () => {
  describe("toJSON", () => {
    it("should format error as JSON object", () => {
      const error = new NotFoundError("Deal not found");

      const json = error.toJSON();

      expect(json).toEqual({
        error: "Deal not found",
        code: "NOT_FOUND",
        statusCode: 404,
      });
    });

    it("should include correct status code for each error type", () => {
      expect(new NotFoundError().toJSON().statusCode).toBe(404);
      expect(new UnauthorizedError().toJSON().statusCode).toBe(401);
      expect(new ForbiddenError().toJSON().statusCode).toBe(403);
      expect(new ValidationError().toJSON().statusCode).toBe(400);
      expect(new ConflictError().toJSON().statusCode).toBe(409);
      expect(new InternalError().toJSON().statusCode).toBe(500);
    });
  });

  describe("toResponse", () => {
    it("should create Response with correct status", async () => {
      const error = new NotFoundError("Not found");

      const response = error.toResponse();

      expect(response.status).toBe(404);
    });

    it("should create Response with JSON body", async () => {
      const error = new NotFoundError("Not found");

      const response = error.toResponse();
      const body = await response.json();

      expect(body.error).toBe("Not found");
      expect(body.code).toBe("NOT_FOUND");
      expect(body.statusCode).toBe(404);
    });
  });

  describe("errorToResponse", () => {
    const originalEnv = process.env.NODE_ENV;
    const env = process.env as { NODE_ENV?: string };

    afterEach(() => {
      env.NODE_ENV = originalEnv;
    });

    it("should convert AppError to Response", async () => {
      const error = new NotFoundError("Not found");

      const response = errorToResponse(error);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Not found");
    });

    it("should convert generic Error to 500 Response", async () => {
      env.NODE_ENV = "development";
      const error = new Error("Something went wrong");

      const response = errorToResponse(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Something went wrong");
    });

    it("should hide error details in production", async () => {
      env.NODE_ENV = "production";
      const error = new Error("Secret database error");

      const response = errorToResponse(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Erro interno do servidor");
      expect(body.error).not.toContain("Secret");
    });

    it("should not include stack trace in production", async () => {
      env.NODE_ENV = "production";
      const error = new Error("Test error");

      const response = errorToResponse(error, { includeStack: true });
      const body = await response.json();

      expect(body.stack).toBeUndefined();
    });

    it("should include stack trace in development when requested", async () => {
      env.NODE_ENV = "development";
      const error = new Error("Test error");

      const response = errorToResponse(error, { includeStack: true });
      const body = await response.json();

      expect(body.stack).toBeDefined();
      expect(body.stack).toContain("Error: Test error");
    });
  });

  describe("withErrorHandling", () => {
    it("should return result when function succeeds", async () => {
      const fn = async (x: number) => x * 2;
      const wrapped = withErrorHandling(fn);

      const result = await wrapped(5);

      expect(result).toBe(10);
    });

    it("should convert AppError to Response", async () => {
      const fn = async () => {
        throw new NotFoundError("Not found");
      };
      const wrapped = withErrorHandling(fn);

      const result = await wrapped();

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(404);
    });

    it("should convert generic Error to 500 Response", async () => {
      const fn = async () => {
        throw new Error("Unexpected error");
      };
      const wrapped = withErrorHandling(fn);

      const result = await wrapped();

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(500);
    });
  });
});
