import { describe, it, expect, beforeEach } from "vitest";
import { GetActivityPhotoKeyUseCase } from "@/domain/activities/application/use-cases/get-activity-photo-key.use-case";
import { InMemoryActivitiesRepository } from "../../repositories/in-memory-activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { UniqueEntityID } from "@/core/unique-entity-id";

function makeActivity(overrides: Partial<InstanceType<typeof Activity>["props"]> = {}) {
  return Activity.create(
    {
      ownerId: "owner-1",
      type: "physical_visit",
      subject: "Visita porta a porta — Padaria do João",
      completed: true,
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any,
    new UniqueEntityID("activity-1"),
  );
}

describe("GetActivityPhotoKeyUseCase", () => {
  let repo: InMemoryActivitiesRepository;
  let sut: GetActivityPhotoKeyUseCase;

  beforeEach(() => {
    repo = new InMemoryActivitiesRepository();
    sut = new GetActivityPhotoKeyUseCase(repo);
  });

  it("retorna o photoKey quando a atividade tem foto e pertence ao requester", async () => {
    await repo.save(makeActivity({ photoKey: "activity-photo/activity-1/fachada.jpg" } as any));

    const result = await sut.execute({ activityId: "activity-1", requesterId: "owner-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.photoKey).toBe("activity-photo/activity-1/fachada.jpg");
  });

  it("retorna erro quando a atividade não existe", async () => {
    const result = await sut.execute({ activityId: "nao-existe", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro quando a atividade não tem foto", async () => {
    await repo.save(makeActivity());

    const result = await sut.execute({ activityId: "activity-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro quando o requester não é dono nem admin", async () => {
    await repo.save(makeActivity({ photoKey: "activity-photo/activity-1/fachada.jpg" } as any));

    const result = await sut.execute({ activityId: "activity-1", requesterId: "outro-user", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("permite admin acessar a foto de outro dono", async () => {
    await repo.save(makeActivity({ photoKey: "activity-photo/activity-1/fachada.jpg" } as any));

    const result = await sut.execute({ activityId: "activity-1", requesterId: "outro-user", requesterRole: "admin" });
    expect(result.isRight()).toBe(true);
  });
});
