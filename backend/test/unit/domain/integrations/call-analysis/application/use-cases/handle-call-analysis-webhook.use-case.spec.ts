import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCallAnalysisRepository } from "../../fakes/in-memory-call-analysis.repository";
import { HandleCallAnalysisWebhookUseCase } from "@/domain/integrations/call-analysis/application/use-cases/handle-call-analysis-webhook.use-case";
import { CallAnalysis } from "@/domain/integrations/call-analysis/enterprise/entities/call-analysis.entity";

const makePendingAnalysis = (jobId = "job-001") =>
  CallAnalysis.create({
    activityId: "activity-1",
    leadId: "lead-1",
    ownerId: "user-1",
    status: "pending",
    jobId,
  });

describe("HandleCallAnalysisWebhookUseCase", () => {
  let repo: InMemoryCallAnalysisRepository;
  let sut: HandleCallAnalysisWebhookUseCase;

  beforeEach(() => {
    repo = new InMemoryCallAnalysisRepository();
    sut = new HandleCallAnalysisWebhookUseCase(repo);
  });

  it("completes analysis with all SPICED fields", async () => {
    const analysis = makePendingAnalysis("job-001");
    await repo.save(analysis);

    const result = await sut.execute({
      jobId: "job-001",
      status: "completed",
      score: 7.4,
      noShowRisk: "MÉDIO",
      noShowRiskText: "Lead demonstrou interesse mas faltou confirmar presença",
      summary: "Reunião produtiva. Lead identificou dor principal.",
      spiced: {
        situation: { text: "Empresa com 50 funcionários, faturamento R$2M", score: 8 },
        pain: { text: "Processo manual consome 3h/dia da equipe", score: 9 },
        impact: { text: "Custo estimado de R$15k/mês em horas perdidas", score: 7 },
        criticalEvent: { text: "Expansão planejada para Q2 exige automação", score: 6 },
        evidence: { text: "Lead mencionou duas vezes a dificuldade operacional", score: 8 },
      },
      microPactos: [
        { id: 1, label: "Lead confirma cadastro", spicedDimension: "S", achieved: true, notes: "Confirmou dados no início" },
        { id: 2, label: "Lead autoriza perguntas", spicedDimension: "S", achieved: true, notes: "Disse 'pode perguntar'" },
        { id: 3, label: "Lead descreve negócio", spicedDimension: "S", achieved: true, notes: "Descreveu em detalhe" },
        { id: 4, label: "Lead nomeia e confirma dor duas vezes", spicedDimension: "P", achieved: true, notes: "Mencionou dor 2x" },
        { id: 5, label: "Lead quantifica custo", spicedDimension: "I", achieved: true, notes: "R$15k/mês" },
        { id: 6, label: "Lead declara urgência", spicedDimension: "C", achieved: false, notes: "Não foi claro" },
        { id: 7, label: "Lead declara urgência [confirma]", spicedDimension: "C", achieved: false, notes: "" },
      ],
      schedulingTechniques: {
        gatilhoDor: { used: true, notes: "Mencionou custo da dor antes de propor reunião" },
        escolhaAlternativa: { used: true, notes: "Ofereceu duas datas para o próximo passo" },
        compromissoVerbalShow: { used: false, notes: "" },
        compromissoEmergencia: { used: false, notes: "" },
      },
      microAnalysis: [
        { timestamp: "00:01:30", text: "Lead demonstrou entusiasmo ao falar do negócio", type: "positive" },
        { timestamp: "00:05:00", text: "SDR falou mais do que ouviu neste trecho", type: "negative" },
        { timestamp: "00:12:00", text: "Urgência não foi bem explorada", type: "warning" },
      ],
      positivePoints: [
        "Identificou a dor principal com precisão",
        "Quantificou o impacto financeiro",
      ],
      improvementPoints: [
        "Explorar urgência com mais profundidade",
        "Usar silêncio após pergunta de dor",
      ],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.analysisId).toBe(analysis.id.toString());
    }

    const saved = repo.items[0];
    expect(saved.status).toBe("completed");
    expect(saved.score).toBe(7.4);
    expect(saved.noShowRisk).toBe("MÉDIO");
    expect(saved.noShowRiskText).toContain("confirmar presença");
    expect(saved.summary).toContain("Reunião produtiva");

    const situation = JSON.parse(saved.spicedSituation!);
    expect(situation.text).toContain("50 funcionários");
    expect(situation.score).toBe(8);

    const pain = JSON.parse(saved.spicedPain!);
    expect(pain.text).toContain("3h/dia");

    const impact = JSON.parse(saved.spicedImpact!);
    expect(impact.text).toContain("R$15k");

    const critical = JSON.parse(saved.spicedCritical!);
    expect(critical.text).toContain("Q2");

    const evidence = JSON.parse(saved.spicedEvidence!);
    expect(evidence.text).toContain("duas vezes");

    const pactos = JSON.parse(saved.microPactos!);
    expect(pactos).toHaveLength(7);
    expect(pactos[0].achieved).toBe(true);
    expect(pactos[5].achieved).toBe(false);

    const techniques = JSON.parse(saved.schedulingTechniques!);
    expect(techniques.gatilhoDor.used).toBe(true);
    expect(techniques.compromissoVerbalShow.used).toBe(false);

    const micro = JSON.parse(saved.microAnalysis!);
    expect(micro).toHaveLength(3);
    expect(micro[0].type).toBe("positive");

    const positive = JSON.parse(saved.positivePoints!);
    expect(positive).toHaveLength(2);
    expect(positive[0]).toContain("dor principal");

    const improvement = JSON.parse(saved.improvementPoints!);
    expect(improvement).toHaveLength(2);
    expect(improvement[0]).toContain("urgência");
  });

  it("sets error status on error webhook", async () => {
    const analysis = makePendingAnalysis("job-002");
    await repo.save(analysis);

    const result = await sut.execute({
      jobId: "job-002",
      status: "error",
      error: "Agent timeout after 120s",
    });

    expect(result.isRight()).toBe(true);

    const saved = repo.items[0];
    expect(saved.status).toBe("error");
    expect(saved.errorMsg).toBe("Agent timeout after 120s");
  });

  it("sets default error message when error field is missing", async () => {
    const analysis = makePendingAnalysis("job-003");
    await repo.save(analysis);

    await sut.execute({
      jobId: "job-003",
      status: "error",
    });

    const saved = repo.items[0];
    expect(saved.status).toBe("error");
    expect(saved.errorMsg).toBe("Erro desconhecido");
  });

  it("returns left when jobId not found", async () => {
    const result = await sut.execute({
      jobId: "nonexistent-job",
      status: "completed",
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("não encontrada");
    }
  });

  it("persists partial SPICED fields when only some are provided", async () => {
    const analysis = makePendingAnalysis("job-004");
    await repo.save(analysis);

    await sut.execute({
      jobId: "job-004",
      status: "completed",
      score: 5.0,
      spiced: {
        situation: { text: "Só situação disponível", score: 5 },
        // pain, impact, etc. not provided
      },
      positivePoints: ["Ponto positivo único"],
    });

    const saved = repo.items[0];
    expect(saved.status).toBe("completed");
    expect(saved.score).toBe(5.0);
    expect(saved.spicedSituation).toBeTruthy();
    expect(saved.spicedPain).toBeUndefined();
    expect(saved.spicedImpact).toBeUndefined();

    const positive = JSON.parse(saved.positivePoints!);
    expect(positive).toHaveLength(1);
  });
});
