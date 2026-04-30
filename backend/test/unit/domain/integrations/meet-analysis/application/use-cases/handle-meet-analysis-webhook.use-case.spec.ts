import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMeetAnalysisRepository } from "../../fakes/in-memory-meet-analysis.repository";
import { HandleMeetAnalysisWebhookUseCase } from "@/domain/integrations/meet-analysis/application/use-cases/handle-meet-analysis-webhook.use-case";
import { MeetAnalysis } from "@/domain/integrations/meet-analysis/enterprise/entities/meet-analysis.entity";

const makePendingAnalysis = (jobId = "job-001") =>
  MeetAnalysis.create({
    activityId: "activity-1",
    leadId: "lead-1",
    ownerId: "user-1",
    status: "pending",
    jobId,
  });

describe("HandleMeetAnalysisWebhookUseCase", () => {
  let repo: InMemoryMeetAnalysisRepository;
  let sut: HandleMeetAnalysisWebhookUseCase;

  beforeEach(() => {
    repo = new InMemoryMeetAnalysisRepository();
    sut = new HandleMeetAnalysisWebhookUseCase(repo);
  });

  it("completes analysis with all DIAG fields", async () => {
    const analysis = makePendingAnalysis("job-001");
    await repo.save(analysis);

    const result = await sut.execute({
      jobId: "job-001",
      status: "completed",
      score: 4,
      summary: "Reunião produtiva com CEO de distribuidora regional.",
      nextStep: "Enviar proposta até quarta-feira",
      diag: {
        business: {
          currentRevenue: "R$ 3M/ano",
          model: "distribuição B2B",
          customers: "~150 clientes",
          averageTicket: "R$ 20k",
          objective: "Dobrar faturamento em 18 meses",
          alreadyTried: "Contratou mais vendedores sem processo",
          text: "Empresa sólida com dor de escala clara.",
          score: 4,
        },
        gaps: {
          aquisicao: { identified: true, text: "Sem prospecção ativa", severity: "high" },
          funil: { identified: true, text: "Conversão < 10%", severity: "high" },
          oferta: { identified: false, text: null, severity: null },
          timeComercial: { identified: true, text: "Vendedores sem método", severity: "medium" },
          retencao: { identified: false, text: null, severity: null },
          dados: { identified: true, text: "Sem CRM nem métricas", severity: "medium" },
          text: "4 gargalos mapeados em aquisição, funil, time e dados.",
          score: 3,
        },
        urgency: {
          trigger: "Vai contratar 3 vendedores em maio",
          criticalEvent: "Contratações em 45 dias",
          consequence: "Contratar sem processo = dinheiro desperdiçado",
          text: "Urgência alta com evento crítico identificado.",
          score: 5,
        },
        decisionPower: {
          decisionMaker: "CEO presente, decide sozinho",
          buyingProcess: "Aprovação informal, autonomia total",
          budget: "Mencionou investimento razoável, sem número",
          text: "Decisor presente com autonomia plena.",
          score: 4,
        },
        engagement: {
          level: "high",
          buyerQuestions: ["Como funciona a implementação?", "Tem cases de distribuidoras?"],
          resistances: ["Preocupado com tempo de implementação"],
          rapport: "Boa conexão, CEO compartilhou desafios pessoais",
          text: "Engajamento alto durante toda a reunião.",
          score: 4,
        },
        closing: {
          buyerSignals: ["Perguntou sobre prazo", "Pediu cases similares", "Perguntou forma de pagamento"],
          sellerCloses: {
            trialClose: { used: true, notes: "Perguntou 'faz sentido avançar?'" },
            nextStepAnchor: { used: true, notes: "Agendou proposta para sexta" },
            urgencyCreation: { used: false, notes: null },
          },
          closingProbability: 72,
          text: "Bom momentum, 3 sinais de compra claros.",
          score: 4,
        },
      },
      positivePoints: ["Dor clara e urgente", "Decisor presente", "Budget existe"],
      improvementPoints: ["Não criou urgência explícita", "Poderia aprofundar impacto financeiro"],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.analysisId).toBe(analysis.id.toString());
    }

    const saved = repo.items[0];
    expect(saved.status).toBe("completed");
    expect(saved.score).toBe(4);
    expect(saved.summary).toContain("CEO de distribuidora");
    expect(saved.nextStep).toContain("quarta-feira");

    const business = JSON.parse(saved.diagBusiness!);
    expect(business.objective).toContain("18 meses");
    expect(business.score).toBe(4);

    const gaps = JSON.parse(saved.diagGaps!);
    expect(gaps.aquisicao.identified).toBe(true);
    expect(gaps.aquisicao.severity).toBe("high");
    expect(gaps.oferta.identified).toBe(false);
    expect(gaps.score).toBe(3);

    const urgency = JSON.parse(saved.diagUrgency!);
    expect(urgency.score).toBe(5);
    expect(urgency.trigger).toContain("maio");

    const decision = JSON.parse(saved.diagDecisionPower!);
    expect(decision.decisionMaker).toContain("CEO");

    const engagement = JSON.parse(saved.diagEngagement!);
    expect(engagement.level).toBe("high");
    expect(engagement.buyerQuestions).toHaveLength(2);

    const closing = JSON.parse(saved.diagClosing!);
    expect(closing.closingProbability).toBe(72);
    expect(closing.buyerSignals).toHaveLength(3);
    expect(closing.sellerCloses.trialClose.used).toBe(true);
    expect(closing.sellerCloses.urgencyCreation.used).toBe(false);

    const positive = JSON.parse(saved.positivePoints!);
    expect(positive).toHaveLength(3);

    const improvement = JSON.parse(saved.improvementPoints!);
    expect(improvement).toHaveLength(2);
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

    await sut.execute({ jobId: "job-003", status: "error" });

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

  it("persists partial DIAG fields when only some are provided", async () => {
    const analysis = makePendingAnalysis("job-004");
    await repo.save(analysis);

    await sut.execute({
      jobId: "job-004",
      status: "completed",
      score: 3,
      diag: {
        urgency: {
          trigger: "Evento crítico em 30 dias",
          criticalEvent: "Lançamento concorrente",
          consequence: "Perda de mercado",
          text: "Urgência alta.",
          score: 5,
        },
      },
      positivePoints: ["Urgência clara"],
    });

    const saved = repo.items[0];
    expect(saved.status).toBe("completed");
    expect(saved.score).toBe(3);
    expect(saved.diagUrgency).toBeTruthy();
    expect(saved.diagBusiness).toBeUndefined();
    expect(saved.diagGaps).toBeUndefined();
    const urgency = JSON.parse(saved.diagUrgency!);
    expect(urgency.score).toBe(5);
  });
});
