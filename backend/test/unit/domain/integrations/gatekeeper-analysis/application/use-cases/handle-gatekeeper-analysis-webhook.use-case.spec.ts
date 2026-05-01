import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryGatekeeperAnalysisRepository } from "../../fakes/in-memory-gatekeeper-analysis.repository";
import { HandleGatekeeperAnalysisWebhookUseCase } from "@/domain/integrations/gatekeeper-analysis/application/use-cases/handle-gatekeeper-analysis-webhook.use-case";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";

const pending = (jobId = "job-001") =>
  GatekeeperAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "pending", jobId });

describe("HandleGatekeeperAnalysisWebhookUseCase", () => {
  let repo: InMemoryGatekeeperAnalysisRepository;
  let sut: HandleGatekeeperAnalysisWebhookUseCase;

  beforeEach(() => {
    repo = new InMemoryGatekeeperAnalysisRepository();
    sut = new HandleGatekeeperAnalysisWebhookUseCase(repo);
  });

  it("completes analysis with all RAPORT dimensions", async () => {
    await repo.save(pending("job-001"));

    const result = await sut.execute({
      jobId: "job-001",
      status: "completed",
      score: 3.8,
      summary: "SDR criou boa conexão com a recepcionista e obteve o nome do decisor.",
      raport: {
        recepcao:  { text: "Tom calmo e confiante.", score: 4 },
        alianca:   { text: "Usou o nome da GK duas vezes.", score: 4, usedGKName: true, connectionMoments: ["Agradeceu o tempo dela"] },
        perguntas: { text: "Fez 3 perguntas empoderadoras.", score: 4, questionsAsked: ["Você pode me ajudar?"] },
        objecoes:  { text: "Respondeu 'manda email' redirecionando.", score: 3, objectionsReceived: ["Manda um email"], responsesGiven: ["Prefiro alinhar pessoalmente"] },
        resultado: { text: "Obteve nome e cargo do decisor.", score: 4, outcome: "got_name", obtained: ["Carlos Mendes - Diretor Comercial"], nextAttemptTip: "Ligar terça às 9h" },
        tecnicas:  { text: "Usou aliança com GK.", score: 3, techniquesUsed: ["aliança com GK"] },
      },
      positivePoints: ["Tom respeitoso", "Conseguiu o nome do DM"],
      improvementPoints: ["Não criou gancho de retorno"],
    });

    expect(result.isRight()).toBe(true);

    const saved = repo.items[0];
    expect(saved.status).toBe("completed");
    expect(saved.score).toBe(3.8);
    expect(saved.summary).toContain("recepcionista");

    const recepcao = JSON.parse(saved.raportRecepcao!);
    expect(recepcao.score).toBe(4);
    expect(recepcao.text).toContain("calmo");

    const alianca = JSON.parse(saved.raportAlianca!);
    expect(alianca.usedGKName).toBe(true);
    expect(alianca.connectionMoments).toHaveLength(1);

    const perguntas = JSON.parse(saved.raportPerguntas!);
    expect(perguntas.questionsAsked).toHaveLength(1);

    const objecoes = JSON.parse(saved.raportObjecoes!);
    expect(objecoes.objectionsReceived).toHaveLength(1);

    const resultado = JSON.parse(saved.raportResultado!);
    expect(resultado.outcome).toBe("got_name");
    expect(resultado.obtained).toHaveLength(1);

    const tecnicas = JSON.parse(saved.raportTecnicas!);
    expect(tecnicas.techniquesUsed).toContain("aliança com GK");

    const pos = JSON.parse(saved.positivePoints!);
    expect(pos).toHaveLength(2);
    const imp = JSON.parse(saved.improvementPoints!);
    expect(imp).toHaveLength(1);
  });

  it("sets error status on error webhook", async () => {
    await repo.save(pending("job-002"));
    await sut.execute({ jobId: "job-002", status: "error", error: "Timeout" });
    expect(repo.items[0].status).toBe("error");
    expect(repo.items[0].errorMsg).toBe("Timeout");
  });

  it("uses default error message when error field missing", async () => {
    await repo.save(pending("job-003"));
    await sut.execute({ jobId: "job-003", status: "error" });
    expect(repo.items[0].errorMsg).toBe("Erro desconhecido");
  });

  it("returns left when jobId not found", async () => {
    const result = await sut.execute({ jobId: "nonexistent", status: "completed" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("não encontrada");
  });

  it("saves partial RAPORT when only some dimensions provided", async () => {
    await repo.save(pending("job-004"));
    await sut.execute({
      jobId: "job-004",
      status: "completed",
      score: 2.5,
      raport: { recepcao: { text: "Abertura fraca.", score: 2 } },
    });
    const saved = repo.items[0];
    expect(saved.raportRecepcao).toBeTruthy();
    expect(saved.raportAlianca).toBeUndefined();
  });
});
