import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDisqualificationReasonsRepository } from "../../fakes/in-memory-disqualification-reasons.repository";
import {
  GetDisqualificationReasonsUseCase,
  CreateDisqualificationReasonUseCase,
  DeleteDisqualificationReasonUseCase,
} from "@/domain/disqualification-reasons/application/use-cases/disqualification-reasons.use-cases";

let repo: InMemoryDisqualificationReasonsRepository;
const user = { requesterId: "u1", requesterRole: "sdr" };
const other = { requesterId: "u2", requesterRole: "sdr" };

beforeEach(() => { repo = new InMemoryDisqualificationReasonsRepository(); });

describe("GetDisqualificationReasonsUseCase", () => {
  it("returns empty list initially", async () => {
    const r = await new GetDisqualificationReasonsUseCase(repo).execute({ requesterId: "u1" });
    expect(r.unwrap()).toHaveLength(0);
  });

  it("returns only owner reasons", async () => {
    const uc = new CreateDisqualificationReasonUseCase(repo);
    await uc.execute({ name: "Sem budget", ownerId: "u1" });
    await uc.execute({ name: "Outro", ownerId: "u2" });
    const r = await new GetDisqualificationReasonsUseCase(repo).execute({ requesterId: "u1" });
    expect(r.unwrap()).toHaveLength(1);
    expect(r.unwrap()[0].name).toBe("Sem budget");
  });
});

describe("CreateDisqualificationReasonUseCase", () => {
  it("creates a reason", async () => {
    const r = await new CreateDisqualificationReasonUseCase(repo).execute({ name: "Sem interesse", ownerId: "u1" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().name).toBe("Sem interesse");
  });

  it("rejects empty name", async () => {
    const r = await new CreateDisqualificationReasonUseCase(repo).execute({ name: "", ownerId: "u1" });
    expect(r.isLeft()).toBe(true);
  });

  it("rejects duplicate name for same owner", async () => {
    const uc = new CreateDisqualificationReasonUseCase(repo);
    await uc.execute({ name: "Sem budget", ownerId: "u1" });
    const r = await uc.execute({ name: "Sem budget", ownerId: "u1" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("ReasonConflictError");
  });

  it("allows same name for different owners", async () => {
    const uc = new CreateDisqualificationReasonUseCase(repo);
    await uc.execute({ name: "Sem budget", ownerId: "u1" });
    const r = await uc.execute({ name: "Sem budget", ownerId: "u2" });
    expect(r.isRight()).toBe(true);
  });
});

describe("DeleteDisqualificationReasonUseCase", () => {
  it("deletes a reason", async () => {
    const reason = (await new CreateDisqualificationReasonUseCase(repo).execute({ name: "Deletar", ownerId: "u1" })).unwrap();
    const r = await new DeleteDisqualificationReasonUseCase(repo).execute({ id: reason.id.toString(), ...user });
    expect(r.isRight()).toBe(true);
    expect(await repo.findById(reason.id.toString())).toBeNull();
  });

  it("rejects not found", async () => {
    const r = await new DeleteDisqualificationReasonUseCase(repo).execute({ id: "no-id", ...user });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("ReasonNotFoundError");
  });

  it("forbids other user from deleting", async () => {
    const reason = (await new CreateDisqualificationReasonUseCase(repo).execute({ name: "Mine", ownerId: "u1" })).unwrap();
    const r = await new DeleteDisqualificationReasonUseCase(repo).execute({ id: reason.id.toString(), ...other });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("ReasonForbiddenError");
  });
});
