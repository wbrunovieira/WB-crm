import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";

function makeContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: authHeader },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = { verifyAsync: vi.fn() } as unknown as JwtService;
    guard = new JwtAuthGuard(jwtService);
  });

  it("lança UnauthorizedException se não há header Authorization", async () => {
    const ctx = makeContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("lança UnauthorizedException se o header não começa com Bearer", async () => {
    const ctx = makeContext("Basic abc123");
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("lança UnauthorizedException se o token é inválido", async () => {
    vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error("invalid"));
    const ctx = makeContext("Bearer token-invalido");
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("retorna true e injeta user no request quando o token é válido", async () => {
    const payload = { sub: "user-1", name: "Bruno", email: "b@wb.com", role: "sdr" };
    vi.mocked(jwtService.verifyAsync).mockResolvedValue(payload);

    const request: Record<string, unknown> = { headers: { authorization: "Bearer token-valido" } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: "user-1",
      name: "Bruno",
      email: "b@wb.com",
      role: "sdr",
    });
  });

  it("mapeia sub → id no AuthenticatedUser", async () => {
    vi.mocked(jwtService.verifyAsync).mockResolvedValue({ sub: "user-42" });

    const request: Record<string, unknown> = { headers: { authorization: "Bearer tok" } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await guard.canActivate(ctx);

    expect((request.user as { id: string }).id).toBe("user-42");
  });
});
