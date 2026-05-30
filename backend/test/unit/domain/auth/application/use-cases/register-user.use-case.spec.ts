import { describe, it, expect, beforeEach } from "vitest";
import { RegisterUserUseCase, UserAlreadyExistsError } from "@/domain/auth/application/use-cases/register-user.use-case";
import { UsersRepository, type UserRecord } from "@/domain/auth/application/repositories/users.repository";
import { InvalidEmailAddressError } from "@/domain/integrations/email/enterprise/value-objects/email-address.vo";

class InMemoryUsersRepository extends UsersRepository {
  public items: UserRecord[] = [];
  async findByEmail(email: string) {
    return this.items.find((u) => u.email === email) ?? null;
  }
  async findAll() { return this.items; }
  async findById(id: string) { return this.items.find((u) => u.id === id) ?? null; }
  async create(data: { id: string; name: string; email: string; passwordHash: string }) {
    const rec: UserRecord = { ...data, role: "sdr" };
    this.items.push(rec);
    return rec;
  }
}

describe("RegisterUserUseCase", () => {
  let repo: InMemoryUsersRepository;
  let sut: RegisterUserUseCase;

  beforeEach(() => {
    repo = new InMemoryUsersRepository();
    sut = new RegisterUserUseCase(repo);
  });

  it("cria usuário com email válido", async () => {
    const result = await sut.execute({ name: "Ana", email: "ana@example.com", password: "secret123" });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.email).toBe("ana@example.com");
      expect(result.value.id).toBeDefined();
    }
    expect(repo.items).toHaveLength(1);
  });

  it("rejeita email malformado com InvalidEmailAddressError (sem persistir)", async () => {
    const result = await sut.execute({ name: "Ana", email: "nao-eh-email", password: "secret123" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value).toBeInstanceOf(InvalidEmailAddressError);
    expect(repo.items).toHaveLength(0);
  });

  it("rejeita email vazio", async () => {
    const result = await sut.execute({ name: "Ana", email: "   ", password: "secret123" });
    expect(result.isLeft()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("rejeita email sem TLD", async () => {
    const result = await sut.execute({ name: "Ana", email: "ana@localhost", password: "secret123" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value).toBeInstanceOf(InvalidEmailAddressError);
  });

  it("rejeita email duplicado com UserAlreadyExistsError", async () => {
    await sut.execute({ name: "Ana", email: "ana@example.com", password: "secret123" });
    const result = await sut.execute({ name: "Outra", email: "ana@example.com", password: "secret123" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value).toBeInstanceOf(UserAlreadyExistsError);
    expect(repo.items).toHaveLength(1);
  });

  it("a validação de email roda antes do lookup de duplicidade", async () => {
    // email inválido nunca deve chegar ao findByEmail/create
    const result = await sut.execute({ name: "Ana", email: "@@", password: "secret123" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value).toBeInstanceOf(InvalidEmailAddressError);
  });
});
