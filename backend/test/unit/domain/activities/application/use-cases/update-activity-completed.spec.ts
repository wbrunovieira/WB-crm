/**
 * PATCH /activities/:id precisa honrar `completed` e `completedAt`.
 *
 * Motivo: o DTO anuncia os dois campos e o Swagger os documenta, mas a use case nunca os
 * mapeava — a requisição respondia HTTP 200, o updatedAt mudava e o campo continuava como
 * estava. Falha silenciosa perfeita: sucesso na resposta, nada gravado.
 *
 * Foi assim que uma visita agendada continuou "pendente" no app depois de o vendedor tê-la
 * registrado em campo: o app marcava a visita como concluída, o servidor dizia 200 e o card
 * nunca saía da lista.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { right } from "@/core/either";
import { InMemoryActivitiesRepository } from "../../repositories/in-memory-activities.repository";
import { UpdateActivityUseCase } from "@/domain/activities/application/use-cases/update-activity.use-case";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { TriggerCallAnalysisUseCase } from "@/domain/integrations/call-analysis/application/use-cases/trigger-call-analysis.use-case";

let repo: InMemoryActivitiesRepository;
let sut: UpdateActivityUseCase;

function makeVisit(overrides: Partial<Parameters<typeof Activity.create>[0]> = {}) {
  return Activity.create({
    ownerId: "user-1",
    type: "physical_visit",
    subject: "Ir mostrar o site pronto",
    completed: false,
    meetingNoShow: false,
    emailReplied: false,
    emailOpenCount: 0,
    emailLinkClickCount: 0,
    leadId: "lead-1",
    dueDate: new Date("2026-09-08T12:30:00.000Z"),
    ...overrides,
  });
}

const patch = (id: string, body: Record<string, unknown>) =>
  sut.execute({ id, requesterId: "user-1", requesterRole: "admin", ...body } as never);

beforeEach(() => {
  repo = new InMemoryActivitiesRepository();
  const trigger = { execute: vi.fn().mockResolvedValue(right({ analysisId: "a-1" })) };
  sut = new UpdateActivityUseCase(repo, trigger as unknown as TriggerCallAnalysisUseCase);
});

describe("UpdateActivityUseCase — concluir atividade", () => {
  it("marca como concluída quando recebe completed: true", async () => {
    const visit = makeVisit();
    await repo.save(visit);

    const result = await patch(visit.id.toString(), { completed: true });

    expect(result.isRight()).toBe(true);
    const saved = await repo.findByIdRaw(visit.id.toString());
    expect(saved?.completed).toBe(true);
  });

  it("usa o completedAt informado", async () => {
    const visit = makeVisit();
    await repo.save(visit);
    const quando = new Date("2026-09-08T18:30:00.000Z");

    await patch(visit.id.toString(), { completed: true, completedAt: quando });

    const saved = await repo.findByIdRaw(visit.id.toString());
    expect(saved?.completedAt?.toISOString()).toBe(quando.toISOString());
  });

  it("preenche completedAt sozinho quando só recebe completed: true", async () => {
    // Quem marca "feito" no celular não deveria precisar mandar o carimbo de hora junto.
    const visit = makeVisit();
    await repo.save(visit);

    await patch(visit.id.toString(), { completed: true });

    const saved = await repo.findByIdRaw(visit.id.toString());
    expect(saved?.completedAt).toBeInstanceOf(Date);
  });

  it("reabre a atividade e limpa o completedAt quando recebe completed: false", async () => {
    const visit = makeVisit({ completed: true, completedAt: new Date("2026-09-01T10:00:00.000Z") });
    await repo.save(visit);

    await patch(visit.id.toString(), { completed: false });

    const saved = await repo.findByIdRaw(visit.id.toString());
    expect(saved?.completed).toBe(false);
    expect(saved?.completedAt ?? null).toBeNull();
  });

  it("não mexe na conclusão quando a edição é de outro campo", async () => {
    const visit = makeVisit({ completed: true, completedAt: new Date("2026-09-01T10:00:00.000Z") });
    await repo.save(visit);

    await patch(visit.id.toString(), { subject: "Outro assunto" });

    const saved = await repo.findByIdRaw(visit.id.toString());
    expect(saved?.completed).toBe(true);
    expect(saved?.completedAt?.toISOString()).toBe("2026-09-01T10:00:00.000Z");
  });
});
