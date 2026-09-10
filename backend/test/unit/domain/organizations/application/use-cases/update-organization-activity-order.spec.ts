/**
 * Ordenação manual das atividades numa organização.
 *
 * Motivo: a página do lead permite reordenar as atividades à mão e a da organização não —
 * mas a coluna `activityOrder` já existe nos DOIS modelos. Não era decisão de produto, era
 * rota que nunca foi escrita, e é o que impede a página da organização de usar o mesmo
 * componente de atividades do lead.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  UpdateOrganizationActivityOrderUseCase,
  ResetOrganizationActivityOrderUseCase,
} from "@/domain/organizations/application/use-cases/update-organization-activity-order.use-case";
import { InMemoryOrganizationsRepository } from "../../repositories/in-memory-organizations.repository";
import { Organization } from "@/domain/organizations/enterprise/entities/organization";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: InMemoryOrganizationsRepository;
let sut: UpdateOrganizationActivityOrderUseCase;
let reset: ResetOrganizationActivityOrderUseCase;

const DONO = "user-1";

async function semear(ownerId = DONO, activityOrder?: string) {
  const org = Organization.create(
    { ownerId, name: "Acme Ltda", activityOrder },
    new UniqueEntityID("org-1"),
  );
  await repo.save(org);
  return org;
}

beforeEach(() => {
  repo = new InMemoryOrganizationsRepository();
  sut = new UpdateOrganizationActivityOrderUseCase(repo);
  reset = new ResetOrganizationActivityOrderUseCase(repo);
});

describe("UpdateOrganizationActivityOrderUseCase", () => {
  it("grava a ordem escolhida", async () => {
    await semear();

    const r = await sut.execute({
      organizationId: "org-1", activityIds: ["a-2", "a-1", "a-3"],
      requesterId: DONO, requesterRole: "sdr",
    });

    expect(r.isRight()).toBe(true);
    const salva = await repo.findByIdRaw("org-1");
    expect(salva?.activityOrder).toBe(JSON.stringify(["a-2", "a-1", "a-3"]));
  });

  it("recusa lista vazia", async () => {
    await semear();

    const r = await sut.execute({
      organizationId: "org-1", activityIds: [], requesterId: DONO, requesterRole: "sdr",
    });

    expect(r.isLeft()).toBe(true);
  });

  it("recusa organização inexistente", async () => {
    const r = await sut.execute({
      organizationId: "nao-existe", activityIds: ["a-1"], requesterId: DONO, requesterRole: "sdr",
    });

    expect(r.isLeft()).toBe(true);
  });

  it("recusa quem não é dono nem admin", async () => {
    await semear("outro-dono");

    const r = await sut.execute({
      organizationId: "org-1", activityIds: ["a-1"], requesterId: DONO, requesterRole: "sdr",
    });

    expect(r.isLeft()).toBe(true);
  });

  it("permite admin mexer em organização de outro dono", async () => {
    await semear("outro-dono");

    const r = await sut.execute({
      organizationId: "org-1", activityIds: ["a-1"], requesterId: DONO, requesterRole: "admin",
    });

    expect(r.isRight()).toBe(true);
  });
});

describe("ResetOrganizationActivityOrderUseCase", () => {
  it("volta para a ordem padrão", async () => {
    await semear(DONO, JSON.stringify(["a-2", "a-1"]));

    const r = await reset.execute({ organizationId: "org-1", requesterId: DONO, requesterRole: "sdr" });

    expect(r.isRight()).toBe(true);
    const salva = await repo.findByIdRaw("org-1");
    expect(salva?.activityOrder).toBeUndefined();
  });

  it("recusa quem não é dono nem admin", async () => {
    await semear("outro-dono");

    const r = await reset.execute({ organizationId: "org-1", requesterId: DONO, requesterRole: "sdr" });

    expect(r.isLeft()).toBe(true);
  });
});
