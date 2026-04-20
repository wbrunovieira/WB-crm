import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryProposalsRepository } from "../../fakes/in-memory-proposals.repository";
import {
  GetProposalsUseCase, GetProposalByIdUseCase,
  CreateProposalUseCase, UpdateProposalUseCase, DeleteProposalUseCase,
} from "@/domain/proposals/application/use-cases/proposals.use-cases";

let repo: InMemoryProposalsRepository;
const user = { requesterId: "u1", requesterRole: "sdr" };
const other = { requesterId: "u2", requesterRole: "sdr" };
const admin = { requesterId: "u2", requesterRole: "admin" };

beforeEach(() => { repo = new InMemoryProposalsRepository(); });

describe("CreateProposalUseCase", () => {
  it("creates with default draft status", async () => {
    const r = await new CreateProposalUseCase(repo).execute({ title: "Proposta A", ownerId: "u1" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().status).toBe("draft");
  });

  it("rejects empty title", async () => {
    const r = await new CreateProposalUseCase(repo).execute({ title: "", ownerId: "u1" });
    expect(r.isLeft()).toBe(true);
  });

  it("rejects invalid status", async () => {
    const r = await new CreateProposalUseCase(repo).execute({ title: "Test", ownerId: "u1", status: "invalid" });
    expect(r.isLeft()).toBe(true);
  });

  it("stores all optional fields", async () => {
    const r = await new CreateProposalUseCase(repo).execute({
      title: "Full Proposal", ownerId: "u1", leadId: "l1", dealId: "d1",
      driveFileId: "f1", driveUrl: "https://drive.google.com/...", fileName: "proposta.pdf", fileSize: 102400,
    });
    expect(r.isRight()).toBe(true);
    const p = r.unwrap();
    expect(p.driveFileId).toBe("f1");
    expect(p.fileSize).toBe(102400);
    expect(p.leadId).toBe("l1");
  });
});

describe("GetProposalsUseCase", () => {
  it("returns only owner proposals", async () => {
    const uc = new CreateProposalUseCase(repo);
    await uc.execute({ title: "Mine", ownerId: "u1" });
    await uc.execute({ title: "Other", ownerId: "u2" });
    const r = await new GetProposalsUseCase(repo).execute({ requesterId: "u1" });
    expect(r.unwrap()).toHaveLength(1);
    expect(r.unwrap()[0].title).toBe("Mine");
  });

  it("filters by leadId", async () => {
    const uc = new CreateProposalUseCase(repo);
    await uc.execute({ title: "Lead Prop", ownerId: "u1", leadId: "l1" });
    await uc.execute({ title: "No Lead", ownerId: "u1" });
    const r = await new GetProposalsUseCase(repo).execute({ requesterId: "u1", filters: { leadId: "l1" } });
    expect(r.unwrap()).toHaveLength(1);
    expect(r.unwrap()[0].leadId).toBe("l1");
  });
});

describe("UpdateProposalUseCase", () => {
  it("updates title and status", async () => {
    const created = (await new CreateProposalUseCase(repo).execute({ title: "Old", ownerId: "u1" })).unwrap();
    const r = await new UpdateProposalUseCase(repo).execute({ id: created.id.toString(), ...user, title: "New", status: "sent" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().title).toBe("New");
    expect(r.unwrap().status).toBe("sent");
    expect(r.unwrap().sentAt).toBeInstanceOf(Date);
  });

  it("forbids other user from updating", async () => {
    const created = (await new CreateProposalUseCase(repo).execute({ title: "Mine", ownerId: "u1" })).unwrap();
    const r = await new UpdateProposalUseCase(repo).execute({ id: created.id.toString(), ...other, title: "Stolen" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("ProposalForbiddenError");
  });

  it("admin can update any proposal", async () => {
    const created = (await new CreateProposalUseCase(repo).execute({ title: "Mine", ownerId: "u1" })).unwrap();
    const r = await new UpdateProposalUseCase(repo).execute({ id: created.id.toString(), ...admin, title: "Admin Edit" });
    expect(r.isRight()).toBe(true);
  });

  it("returns not found for unknown id", async () => {
    const r = await new UpdateProposalUseCase(repo).execute({ id: "no-id", ...user });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("ProposalNotFoundError");
  });
});

describe("DeleteProposalUseCase", () => {
  it("deletes own proposal", async () => {
    const created = (await new CreateProposalUseCase(repo).execute({ title: "Delete Me", ownerId: "u1" })).unwrap();
    const r = await new DeleteProposalUseCase(repo).execute({ id: created.id.toString(), ...user });
    expect(r.isRight()).toBe(true);
    expect(await repo.findById(created.id.toString())).toBeNull();
  });

  it("forbids other user from deleting", async () => {
    const created = (await new CreateProposalUseCase(repo).execute({ title: "Mine", ownerId: "u1" })).unwrap();
    const r = await new DeleteProposalUseCase(repo).execute({ id: created.id.toString(), ...other });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("ProposalForbiddenError");
  });
});
