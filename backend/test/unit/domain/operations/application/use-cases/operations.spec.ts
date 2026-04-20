import { describe, it, expect, beforeEach } from "vitest";
import { TransferToOperationsUseCase, RevertFromOperationsUseCase } from "@/domain/operations/application/use-cases/operations.use-cases";
import { FakeOperationsRepository } from "../../fakes/fake-operations.repository";

let repo: FakeOperationsRepository;

beforeEach(() => {
  repo = new FakeOperationsRepository();
  repo.seed("lead", { id: "lead-001", ownerId: "user-001", inOperationsAt: null });
  repo.seed("organization", { id: "org-001", ownerId: "user-001", inOperationsAt: null });
});

describe("TransferToOperationsUseCase", () => {
  it("transfers lead to operations", async () => {
    const result = await new TransferToOperationsUseCase(repo).execute({ entityType: "lead", entityId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);
    const entity = repo.entities.get("lead:lead-001");
    expect(entity?.inOperationsAt).toBeInstanceOf(Date);
  });

  it("transfers organization to operations", async () => {
    await new TransferToOperationsUseCase(repo).execute({ entityType: "organization", entityId: "org-001", requesterId: "user-001", requesterRole: "sdr" });
    expect(repo.entities.get("organization:org-001")?.inOperationsAt).toBeInstanceOf(Date);
  });

  it("returns not found for unknown entity", async () => {
    const result = await new TransferToOperationsUseCase(repo).execute({ entityType: "lead", entityId: "x", requesterId: "user-001", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("OperationsEntityNotFoundError");
  });

  it("returns forbidden for non-owner", async () => {
    const result = await new TransferToOperationsUseCase(repo).execute({ entityType: "lead", entityId: "lead-001", requesterId: "user-999", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("OperationsForbiddenError");
  });

  it("allows admin to transfer any entity", async () => {
    const result = await new TransferToOperationsUseCase(repo).execute({ entityType: "lead", entityId: "lead-001", requesterId: "admin-001", requesterRole: "admin" });
    expect(result.isRight()).toBe(true);
  });

  it("returns InvalidEntityTypeError for unknown type", async () => {
    const result = await new TransferToOperationsUseCase(repo).execute({ entityType: "contact", entityId: "x", requesterId: "user-001", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("InvalidEntityTypeError");
  });
});

describe("RevertFromOperationsUseCase", () => {
  it("reverts lead from operations", async () => {
    repo.entities.set("lead:lead-001", { id: "lead-001", ownerId: "user-001", inOperationsAt: new Date() });
    const result = await new RevertFromOperationsUseCase(repo).execute({ entityType: "lead", entityId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);
    expect(repo.entities.get("lead:lead-001")?.inOperationsAt).toBeNull();
  });

  it("returns forbidden for non-owner on revert", async () => {
    const result = await new RevertFromOperationsUseCase(repo).execute({ entityType: "lead", entityId: "lead-001", requesterId: "user-999", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });
});
