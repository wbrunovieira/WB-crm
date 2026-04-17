/**
 * Payload do JWT emitido pelo NextAuth.
 * O NextAuth usa "sub" como user ID no token JWT.
 * Campos adicionais são configurados via callbacks.session / jwt no authOptions do CRM.
 */
export interface JwtPayload {
  sub: string;
  name?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Usuário injetado pelo @CurrentUser() decorator após validação do JWT.
 */
export interface AuthenticatedUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}
