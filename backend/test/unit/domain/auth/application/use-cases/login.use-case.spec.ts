import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoginUseCase } from "@/domain/auth/application/use-cases/login.use-case";
import { UsersRepository } from "@/domain/auth/application/repositories/users.repository";
import * as bcrypt from "bcryptjs";

class InMemoryUsersRepository extends UsersRepository {
  public items: Array<{ id: string; name: string; email: string; role: string; passwordHash: string }> = [];

  async findByEmail(email: string) {
    return this.items.find((u) => u.email === email) ?? null;
  }
  async findById(id: string) { return this.items.find((u) => u.id === id) ?? null; }
  async findAll() { return this.items; }
  async create(data: { id: string; name: string; email: string; passwordHash: string }) {
    const record = { ...data, role: "sdr" };
    this.items.push(record);
    return record;
  }
}

const fakeJwt = { signAsync: vi.fn().mockResolvedValue("signed.jwt.token") };

describe("LoginUseCase", () => {
  let repo: InMemoryUsersRepository;
  let sut: LoginUseCase;

  beforeEach(() => {
    repo = new InMemoryUsersRepository();
    sut = new LoginUseCase(repo, fakeJwt as any);
    vi.clearAllMocks();
    fakeJwt.signAsync.mockResolvedValue("signed.jwt.token");
  });

  it("retorna erro quando usuário não existe", async () => {
    const result = await sut.execute({ email: "nao@existe.com", password: "123" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toBe("Credenciais inválidas");
  });

  it("retorna erro quando senha está errada", async () => {
    repo.items.push({
      id: "user-1",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
      passwordHash: await bcrypt.hash("senha-correta", 10),
    });

    const result = await sut.execute({ email: "admin@test.com", password: "senha-errada" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toBe("Credenciais inválidas");
  });

  it("retorna accessToken quando credenciais estão corretas", async () => {
    repo.items.push({
      id: "user-1",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
      passwordHash: await bcrypt.hash("senha123", 10),
    });

    const result = await sut.execute({ email: "admin@test.com", password: "senha123" });
    expect(result.isRight()).toBe(true);
    const { accessToken } = result.unwrap();
    expect(accessToken).toBe("signed.jwt.token");
  });

  it("assina o JWT com sub, name, email, role corretos", async () => {
    repo.items.push({
      id: "user-42",
      name: "Bruno",
      email: "bruno@test.com",
      role: "sdr",
      passwordHash: await bcrypt.hash("abc123", 10),
    });

    await sut.execute({ email: "bruno@test.com", password: "abc123" });

    expect(fakeJwt.signAsync).toHaveBeenCalledWith({
      sub: "user-42",
      name: "Bruno",
      email: "bruno@test.com",
      role: "sdr",
    });
  });

  it("não chama JWT quando credenciais são inválidas", async () => {
    const result = await sut.execute({ email: "x@x.com", password: "x" });
    expect(result.isLeft()).toBe(true);
    expect(fakeJwt.signAsync).not.toHaveBeenCalled();
  });
});
