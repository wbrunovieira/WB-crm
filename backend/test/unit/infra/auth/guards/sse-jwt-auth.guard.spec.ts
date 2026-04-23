import { describe, it, expect, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";

const SECRET = "test-secret";

function makeContext(token?: string, headerToken?: string): ExecutionContext {
  const request = {
    headers: headerToken ? { authorization: `Bearer ${headerToken}` } : {},
    query: token ? { token } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("SseJwtAuthGuard", () => {
  let guard: SseJwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET, signOptions: { expiresIn: "1h" } })],
      providers: [SseJwtAuthGuard],
    }).compile();

    guard = module.get(SseJwtAuthGuard);
    jwtService = module.get(JwtService);
  });

  it("rejects request with no token", async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it("rejects request with invalid token", async () => {
    await expect(guard.canActivate(makeContext("invalid.token.here"))).rejects.toThrow(UnauthorizedException);
  });

  it("accepts valid token via query param", async () => {
    const token = jwtService.sign({ sub: "user-1", role: "admin" });
    const result = await guard.canActivate(makeContext(token));
    expect(result).toBe(true);
  });

  it("accepts valid token via Authorization header", async () => {
    const token = jwtService.sign({ sub: "user-1", role: "admin" });
    const result = await guard.canActivate(makeContext(undefined, token));
    expect(result).toBe(true);
  });

  it("attaches user to request after successful auth", async () => {
    const token = jwtService.sign({ sub: "user-1", name: "Alice", email: "a@test.com", role: "sdr" });
    const req = { headers: {}, query: { token } };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    await guard.canActivate(ctx);
    expect((req as any).user).toMatchObject({ id: "user-1", name: "Alice", email: "a@test.com", role: "sdr" });
  });
});
