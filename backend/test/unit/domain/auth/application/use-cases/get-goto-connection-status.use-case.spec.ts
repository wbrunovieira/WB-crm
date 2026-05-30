import { describe, it, expect } from "vitest";
import { GetGoToConnectionStatusUseCase } from "@/domain/auth/application/use-cases/get-goto-connection-status.use-case";

function repoWith(tokens: unknown) {
  return { loadGoToTokens: async () => tokens } as never;
}
const NOW = 1_000_000;

describe("GetGoToConnectionStatusUseCase", () => {
  it("sem tokens → connected:false", async () => {
    const sut = new GetGoToConnectionStatusUseCase(repoWith(null));
    expect(await sut.execute(NOW)).toEqual({ connected: false });
  });

  it("token válido no futuro → connected, não expirado", async () => {
    const sut = new GetGoToConnectionStatusUseCase(repoWith({ refreshToken: "r", expiresAt: NOW + 5000 }));
    const s = await sut.execute(NOW);
    expect(s).toMatchObject({ connected: true, hasRefreshToken: true, expiresAt: NOW + 5000, isExpired: false, expiresInMs: 5000 });
  });

  it("token expirado → isExpired:true e expiresInMs negativo", async () => {
    const sut = new GetGoToConnectionStatusUseCase(repoWith({ refreshToken: "", expiresAt: NOW - 3000 }));
    const s = await sut.execute(NOW);
    expect(s.connected).toBe(true);
    expect(s.isExpired).toBe(true);
    expect(s.hasRefreshToken).toBe(false);
    expect(s.expiresInMs).toBe(-3000);
  });
});
