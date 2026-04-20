import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCadencesRepository } from "../../fakes/in-memory-cadences.repository";
import { Cadence } from "@/domain/cadences/enterprise/entities/cadence";
import {
  CreateCadenceUseCase, UpdateCadenceUseCase, DeleteCadenceUseCase,
  GetCadencesUseCase, GetCadenceByIdUseCase,
  PublishCadenceUseCase, UnpublishCadenceUseCase,
  CreateCadenceStepUseCase, UpdateCadenceStepUseCase, DeleteCadenceStepUseCase,
  ReorderCadenceStepsUseCase, GetCadenceStepsUseCase,
  ApplyCadenceToLeadUseCase, GetLeadCadencesUseCase,
  PauseLeadCadenceUseCase, ResumeLeadCadenceUseCase, CancelLeadCadenceUseCase,
  GetCadenceLeadCountUseCase,
} from "@/domain/cadences/application/use-cases/cadences.use-cases";

let repo: InMemoryCadencesRepository;
const admin = { requesterId: "u1", requesterRole: "admin" };
const user = { requesterId: "u1", requesterRole: "sdr" };
const other = { requesterId: "u2", requesterRole: "sdr" };

function makeUseCases() {
  return {
    create: new CreateCadenceUseCase(repo),
    update: new UpdateCadenceUseCase(repo),
    remove: new DeleteCadenceUseCase(repo),
    list: new GetCadencesUseCase(repo),
    getById: new GetCadenceByIdUseCase(repo),
    publish: new PublishCadenceUseCase(repo),
    unpublish: new UnpublishCadenceUseCase(repo),
    createStep: new CreateCadenceStepUseCase(repo),
    updateStep: new UpdateCadenceStepUseCase(repo),
    deleteStep: new DeleteCadenceStepUseCase(repo),
    reorder: new ReorderCadenceStepsUseCase(repo),
    getSteps: new GetCadenceStepsUseCase(repo),
    apply: new ApplyCadenceToLeadUseCase(repo),
    getLeadCadences: new GetLeadCadencesUseCase(repo),
    pause: new PauseLeadCadenceUseCase(repo),
    resume: new ResumeLeadCadenceUseCase(repo),
    cancel: new CancelLeadCadenceUseCase(repo),
    leadCount: new GetCadenceLeadCountUseCase(repo),
  };
}

beforeEach(() => { repo = new InMemoryCadencesRepository(); });

describe("CreateCadenceUseCase", () => {
  it("creates a cadence with auto slug", async () => {
    const uc = new CreateCadenceUseCase(repo);
    const r = await uc.execute({ name: "Cadência 14 Dias", ownerId: "u1" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().slug).toBe("cadencia-14-dias");
  });

  it("rejects invalid name", async () => {
    const uc = new CreateCadenceUseCase(repo);
    const r = await uc.execute({ name: "", ownerId: "u1" });
    expect(r.isLeft()).toBe(true);
  });

  it("rejects duplicate slug for same owner", async () => {
    const uc = new CreateCadenceUseCase(repo);
    await uc.execute({ name: "Test Slug", ownerId: "u1" });
    const r = await uc.execute({ name: "Test Slug", ownerId: "u1" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("CadenceSlugConflictError");
  });
});

describe("UpdateCadenceUseCase", () => {
  it("updates cadence name", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Old Name", ownerId: "u1" })).unwrap();
    const r = await uc.update.execute({ id: cadence.id.toString(), ...user, name: "New Name" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().name).toBe("New Name");
  });

  it("forbids other user from updating", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Mine", ownerId: "u1" })).unwrap();
    const r = await uc.update.execute({ id: cadence.id.toString(), ...other, name: "Stolen" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("CadenceForbiddenError");
  });

  it("rejects not found", async () => {
    const uc = makeUseCases();
    const r = await uc.update.execute({ id: "no-id", ...user, name: "X" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("CadenceNotFoundError");
  });
});

describe("PublishCadenceUseCase / UnpublishCadenceUseCase", () => {
  it("publishes a draft cadence", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    const r = await uc.publish.execute({ id: cadence.id.toString(), ...user });
    expect(r.isRight()).toBe(true);
    expect((await repo.findById(cadence.id.toString()))!.status).toBe("active");
  });

  it("cannot publish archived cadence", async () => {
    const uc = makeUseCases();
    const cadence = Cadence.create({ name: "Test", ownerId: "u1", status: "archived" }).unwrap();
    await repo.save(cadence);
    const r = await uc.publish.execute({ id: cadence.id.toString(), ...user });
    expect(r.isLeft()).toBe(true);
  });

  it("unpublishes an active cadence", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    await uc.publish.execute({ id: cadence.id.toString(), ...user });
    await uc.unpublish.execute({ id: cadence.id.toString(), ...user });
    expect((await repo.findById(cadence.id.toString()))!.status).toBe("draft");
  });
});

describe("DeleteCadenceUseCase", () => {
  it("deletes cadence", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Delete Me", ownerId: "u1" })).unwrap();
    const r = await uc.remove.execute({ id: cadence.id.toString(), ...user });
    expect(r.isRight()).toBe(true);
    expect(await repo.findById(cadence.id.toString())).toBeNull();
  });
});

describe("Step use cases", () => {
  it("creates a step", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    const r = await uc.createStep.execute({
      cadenceId: cadence.id.toString(),
      dayNumber: 1, channel: "email", subject: "Hi", ...user,
    });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().dayNumber).toBe(1);
  });

  it("rejects step with invalid channel", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    const r = await uc.createStep.execute({
      cadenceId: cadence.id.toString(),
      dayNumber: 1, channel: "fax", subject: "Hi", ...user,
    });
    expect(r.isLeft()).toBe(true);
  });

  it("updates a step", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    const step = (await uc.createStep.execute({ cadenceId: cadence.id.toString(), dayNumber: 1, channel: "email", subject: "Hi", ...user })).unwrap();
    const r = await uc.updateStep.execute({ stepId: step.id.toString(), ...user, dayNumber: 5 });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().dayNumber).toBe(5);
  });

  it("deletes a step", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    const step = (await uc.createStep.execute({ cadenceId: cadence.id.toString(), dayNumber: 1, channel: "email", subject: "Hi", ...user })).unwrap();
    await uc.deleteStep.execute({ stepId: step.id.toString(), ...user });
    expect(await repo.findStepById(step.id.toString())).toBeNull();
  });

  it("reorders steps", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    const s1 = (await uc.createStep.execute({ cadenceId: cadence.id.toString(), dayNumber: 1, channel: "email", subject: "S1", order: 0, ...user })).unwrap();
    const s2 = (await uc.createStep.execute({ cadenceId: cadence.id.toString(), dayNumber: 2, channel: "call", subject: "S2", order: 1, ...user })).unwrap();
    await uc.reorder.execute({ cadenceId: cadence.id.toString(), orderedStepIds: [s2.id.toString(), s1.id.toString()], ...user });
    const steps = await repo.findStepsByCadence(cadence.id.toString());
    expect(steps[0].id.toString()).toBe(s2.id.toString());
  });
});

describe("ApplyCadenceToLeadUseCase", () => {
  it("applies cadence to lead and generates activities", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    await uc.createStep.execute({ cadenceId: cadence.id.toString(), dayNumber: 1, channel: "email", subject: "Day 1", ...user });
    await uc.createStep.execute({ cadenceId: cadence.id.toString(), dayNumber: 3, channel: "call", subject: "Day 3", ...user });

    const r = await uc.apply.execute({ cadenceId: cadence.id.toString(), leadId: "l1", ...user });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().activities).toHaveLength(2);
  });

  it("forbids other user from applying", async () => {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    const r = await uc.apply.execute({ cadenceId: cadence.id.toString(), leadId: "l1", ...other });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("CadenceForbiddenError");
  });
});

describe("Lead cadence lifecycle", () => {
  async function setup() {
    const uc = makeUseCases();
    const cadence = (await uc.create.execute({ name: "Test", ownerId: "u1" })).unwrap();
    await uc.createStep.execute({ cadenceId: cadence.id.toString(), dayNumber: 1, channel: "email", subject: "Hi", ...user });
    const applied = (await uc.apply.execute({ cadenceId: cadence.id.toString(), leadId: "l1", ...user })).unwrap();
    return { uc, leadCadenceId: applied.leadCadenceId };
  }

  it("pauses a lead cadence", async () => {
    const { uc, leadCadenceId } = await setup();
    const r = await uc.pause.execute({ leadCadenceId, ...user });
    expect(r.isRight()).toBe(true);
    expect((await repo.findLeadCadenceById(leadCadenceId))!.status).toBe("paused");
  });

  it("resumes a paused lead cadence", async () => {
    const { uc, leadCadenceId } = await setup();
    await uc.pause.execute({ leadCadenceId, ...user });
    await uc.resume.execute({ leadCadenceId, ...user });
    expect((await repo.findLeadCadenceById(leadCadenceId))!.status).toBe("active");
  });

  it("cancels a lead cadence", async () => {
    const { uc, leadCadenceId } = await setup();
    const r = await uc.cancel.execute({ leadCadenceId, ...user });
    expect(r.isRight()).toBe(true);
    expect((await repo.findLeadCadenceById(leadCadenceId))!.status).toBe("cancelled");
  });

  it("forbids other user from pausing", async () => {
    const { uc, leadCadenceId } = await setup();
    const r = await uc.pause.execute({ leadCadenceId, ...other });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("CadenceForbiddenError");
  });
});

describe("GetCadencesUseCase - icpId filter", () => {
  it("returns all cadences when no icpId filter", async () => {
    const uc = makeUseCases();
    await uc.create.execute({ name: "Cadência A", ownerId: "u1" });
    await uc.create.execute({ name: "Cadência B", ownerId: "u1" });
    const r = await uc.list.execute({ requesterId: "u1" });
    expect(r.unwrap()).toHaveLength(2);
  });

  it("filters cadences by icpId", async () => {
    const create = new CreateCadenceUseCase(repo);
    await create.execute({ name: "With ICP", ownerId: "u1", icpId: "icp-001" });
    await create.execute({ name: "No ICP", ownerId: "u1" });
    const r = await new GetCadencesUseCase(repo).execute({ requesterId: "u1", icpId: "icp-001" });
    const list = r.unwrap();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("With ICP");
  });
});

describe("GetCadenceLeadCountUseCase", () => {
  async function makeCadenceWithLeads(activeCount: number, cancelledCount: number) {
    const uc = makeUseCases();
    const { value: cadence } = await uc.create.execute({ name: "Test", ownerId: "u1" }) as { value: Cadence };
    const cadenceId = cadence.id.toString();
    for (let i = 0; i < activeCount; i++) {
      await repo.applyToLead({ leadId: `lead-active-${i}`, cadenceId, startDate: new Date(), ownerId: "u1" }, []);
    }
    for (let i = 0; i < cancelledCount; i++) {
      const { leadCadenceId } = await repo.applyToLead({ leadId: `lead-cancel-${i}`, cadenceId, startDate: new Date(), ownerId: "u1" }, []);
      await repo.cancelLeadCadence(leadCadenceId);
    }
    return { uc, cadenceId };
  }

  it("returns count of active leads", async () => {
    const { uc, cadenceId } = await makeCadenceWithLeads(3, 2);
    const r = await uc.leadCount.execute({ cadenceId, ...user });
    expect(r.unwrap().count).toBe(3);
  });

  it("returns 0 when no active leads", async () => {
    const { uc, cadenceId } = await makeCadenceWithLeads(0, 2);
    const r = await uc.leadCount.execute({ cadenceId, ...user });
    expect(r.unwrap().count).toBe(0);
  });

  it("returns not found for unknown cadence", async () => {
    const uc = makeUseCases();
    const r = await uc.leadCount.execute({ cadenceId: "nope", ...user });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("CadenceNotFoundError");
  });

  it("returns forbidden for wrong owner", async () => {
    const { uc, cadenceId } = await makeCadenceWithLeads(1, 0);
    const r = await uc.leadCount.execute({ cadenceId, ...other });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).name).toBe("CadenceForbiddenError");
  });
});
