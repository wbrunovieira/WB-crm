import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySharedEntitiesRepository } from "../../repositories/in-memory-shared-entities.repository";
import {
  ShareEntityUseCase,
  UnshareEntityUseCase,
  GetEntitySharesUseCase,
  TransferEntityUseCase,
} from "@/domain/shared-entities/application/use-cases/shared-entities.use-cases";

const ADMIN_ID = "admin-001";
const SDR_ID = "sdr-001";
const LEAD_ID = "lead-abc-123";

let repo: InMemorySharedEntitiesRepository;

beforeEach(() => {
  repo = new InMemorySharedEntitiesRepository();
});

// ─── ShareEntityUseCase ───────────────────────────────────────────────────────

describe("ShareEntityUseCase", () => {
  it("admin compartilha entidade com sucesso", async () => {
    const uc = new ShareEntityUseCase(repo);
    const result = await uc.execute({
      entityType: "lead",
      entityId: LEAD_ID,
      sharedWithUserId: SDR_ID,
      requesterId: ADMIN_ID,
      requesterRole: "admin",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.share.entityType).toBe("lead");
      expect(result.value.share.entityId).toBe(LEAD_ID);
      expect(result.value.share.sharedWithUserId).toBe(SDR_ID);
      expect(result.value.share.sharedByUserId).toBe(ADMIN_ID);
    }
    expect(repo.items).toHaveLength(1);
  });

  it("não-admin não pode compartilhar", async () => {
    const uc = new ShareEntityUseCase(repo);
    const result = await uc.execute({
      entityType: "lead",
      entityId: LEAD_ID,
      sharedWithUserId: "outro-usuario",
      requesterId: SDR_ID,
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: expect.stringContaining("administradores") });
    expect(repo.items).toHaveLength(0);
  });

  it("retorna erro se tipo de entidade inválido", async () => {
    const uc = new ShareEntityUseCase(repo);
    const result = await uc.execute({
      entityType: "invalid-type" as never,
      entityId: "x",
      sharedWithUserId: SDR_ID,
      requesterId: ADMIN_ID,
      requesterRole: "admin",
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: expect.stringContaining("Tipo inválido") });
  });

  it("não pode compartilhar consigo mesmo", async () => {
    const uc = new ShareEntityUseCase(repo);
    const result = await uc.execute({
      entityType: "lead",
      entityId: LEAD_ID,
      sharedWithUserId: ADMIN_ID,
      requesterId: ADMIN_ID,
      requesterRole: "admin",
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: expect.stringContaining("próprio usuário") });
  });

  it("retorna erro se já compartilhado com o mesmo usuário", async () => {
    const uc = new ShareEntityUseCase(repo);
    await uc.execute({ entityType: "lead", entityId: LEAD_ID, sharedWithUserId: SDR_ID, requesterId: ADMIN_ID, requesterRole: "admin" });
    const result = await uc.execute({ entityType: "lead", entityId: LEAD_ID, sharedWithUserId: SDR_ID, requesterId: ADMIN_ID, requesterRole: "admin" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: expect.stringContaining("já compartilhada") });
  });

  it.each(["lead", "contact", "organization", "partner", "deal"] as const)(
    "compartilha todos os tipos: %s",
    async (type) => {
      const uc = new ShareEntityUseCase(repo);
      const result = await uc.execute({
        entityType: type,
        entityId: "entity-id",
        sharedWithUserId: SDR_ID,
        requesterId: ADMIN_ID,
        requesterRole: "admin",
      });
      expect(result.isRight()).toBe(true);
    },
  );
});

// ─── UnshareEntityUseCase ─────────────────────────────────────────────────────

describe("UnshareEntityUseCase", () => {
  it("admin remove compartilhamento com sucesso", async () => {
    const share = new ShareEntityUseCase(repo);
    const created = await share.execute({
      entityType: "lead", entityId: LEAD_ID, sharedWithUserId: SDR_ID,
      requesterId: ADMIN_ID, requesterRole: "admin",
    });
    if (created.isLeft()) throw created.value;
    const shareId = created.value.share.id.toString();

    const uc = new UnshareEntityUseCase(repo);
    const result = await uc.execute(shareId, "admin");

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("não-admin não pode remover compartilhamento", async () => {
    const uc = new UnshareEntityUseCase(repo);
    const result = await uc.execute("any-id", "sdr");
    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: expect.stringContaining("administradores") });
  });

  it("retorna erro para share inexistente", async () => {
    const uc = new UnshareEntityUseCase(repo);
    const result = await uc.execute("id-nao-existe", "admin");
    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: expect.stringContaining("não encontrado") });
  });
});

// ─── GetEntitySharesUseCase ───────────────────────────────────────────────────

describe("GetEntitySharesUseCase", () => {
  it("admin lista compartilhamentos de uma entidade", async () => {
    const share = new ShareEntityUseCase(repo);
    await share.execute({ entityType: "lead", entityId: LEAD_ID, sharedWithUserId: SDR_ID, requesterId: ADMIN_ID, requesterRole: "admin" });
    await share.execute({ entityType: "lead", entityId: LEAD_ID, sharedWithUserId: "sdr-002", requesterId: ADMIN_ID, requesterRole: "admin" });

    const uc = new GetEntitySharesUseCase(repo);
    const result = await uc.execute("lead", LEAD_ID, "admin");

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.shares).toHaveLength(2);
  });

  it("lista vazia quando não há compartilhamentos", async () => {
    const uc = new GetEntitySharesUseCase(repo);
    const result = await uc.execute("lead", "lead-sem-shares", "admin");
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.shares).toHaveLength(0);
  });

  it("não-admin não pode listar compartilhamentos", async () => {
    const uc = new GetEntitySharesUseCase(repo);
    const result = await uc.execute("lead", LEAD_ID, "sdr");
    expect(result.isLeft()).toBe(true);
  });
});

// ─── TransferEntityUseCase ────────────────────────────────────────────────────

describe("TransferEntityUseCase", () => {
  it("admin transfere ownership com sucesso", async () => {
    // Primeiro compartilha (para verificar que shares são removidos após transfer)
    const share = new ShareEntityUseCase(repo);
    await share.execute({ entityType: "lead", entityId: LEAD_ID, sharedWithUserId: SDR_ID, requesterId: ADMIN_ID, requesterRole: "admin" });
    expect(repo.items).toHaveLength(1);

    const uc = new TransferEntityUseCase(repo);
    const result = await uc.execute({
      entityType: "lead",
      entityId: LEAD_ID,
      newOwnerId: SDR_ID,
      requesterRole: "admin",
    });

    expect(result.isRight()).toBe(true);
    expect(repo.ownershipChanges).toHaveLength(1);
    expect(repo.ownershipChanges[0]).toMatchObject({ entityType: "lead", entityId: LEAD_ID, newOwnerId: SDR_ID });
    // Shares removidos após transfer
    expect(repo.items).toHaveLength(0);
  });

  it("não-admin não pode transferir", async () => {
    const uc = new TransferEntityUseCase(repo);
    const result = await uc.execute({
      entityType: "lead", entityId: LEAD_ID, newOwnerId: SDR_ID, requesterRole: "sdr",
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ message: expect.stringContaining("administradores") });
  });

  it("retorna erro para tipo inválido", async () => {
    const uc = new TransferEntityUseCase(repo);
    const result = await uc.execute({
      entityType: "invalid" as never, entityId: "x", newOwnerId: "y", requesterRole: "admin",
    });
    expect(result.isLeft()).toBe(true);
  });
});
