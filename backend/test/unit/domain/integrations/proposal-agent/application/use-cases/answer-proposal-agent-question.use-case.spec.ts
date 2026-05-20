import { describe, it, expect, beforeEach } from "vitest";
import { AnswerProposalAgentQuestionUseCase } from "@/domain/integrations/proposal-agent/application/use-cases/answer-proposal-agent-question.use-case";
import { InMemoryProposalsRepository } from "../../fakes/in-memory-proposals.repository";
import { FakeProposalAgentPort } from "../../fakes/fake-proposal-agent.port";
import { Proposal } from "@/domain/proposals/enterprise/entities/proposal";
import { UniqueEntityID } from "@/core/unique-entity-id";

function makeProposal(agentStatus: string, ownerId = "user-1") {
  const p = Proposal.create({
    title: "Proposta Teste",
    ownerId,
    leadId: "lead-1",
    agentJobId: "job-1",
    agentStatus,
    agentCurrentQuestion: "Qual é o prazo?",
  }, new UniqueEntityID("prop-1")).unwrap();
  return p;
}

describe("AnswerProposalAgentQuestionUseCase", () => {
  let repo: InMemoryProposalsRepository;
  let agentPort: FakeProposalAgentPort;
  let sut: AnswerProposalAgentQuestionUseCase;

  beforeEach(() => {
    repo = new InMemoryProposalsRepository();
    agentPort = new FakeProposalAgentPort();
    sut = new AnswerProposalAgentQuestionUseCase(repo, agentPort);
  });

  it("retorna erro se proposta não encontrada", async () => {
    const result = await sut.execute({ proposalId: "x", requesterId: "user-1", answer: "30 dias" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro se usuário não é dono", async () => {
    repo.items.push(makeProposal("awaiting_answer", "outro-user"));
    const result = await sut.execute({ proposalId: "prop-1", requesterId: "user-1", answer: "30 dias" });
    expect(result.isLeft()).toBe(true);
    expect(result.value?.message).toContain("negado");
  });

  it("retorna erro se proposta não está aguardando resposta", async () => {
    repo.items.push(makeProposal("processing"));
    const result = await sut.execute({ proposalId: "prop-1", requesterId: "user-1", answer: "30 dias" });
    expect(result.isLeft()).toBe(true);
  });

  it("envia resposta ao agente e atualiza status para processing", async () => {
    repo.items.push(makeProposal("awaiting_answer"));

    const result = await sut.execute({ proposalId: "prop-1", requesterId: "user-1", answer: "30 dias" });

    expect(result.isRight()).toBe(true);
    expect(agentPort.answerCalls).toHaveLength(1);
    expect(agentPort.answerCalls[0].jobId).toBe("job-1");
    expect(agentPort.answerCalls[0].answer).toBe("30 dias");
    expect(repo.items[0].agentStatus).toBe("processing");
    expect(repo.items[0].agentCurrentQuestion).toBeUndefined();
  });

  it("retorna erro se agente falhar", async () => {
    repo.items.push(makeProposal("awaiting_answer"));
    agentPort.shouldThrow = true;

    const result = await sut.execute({ proposalId: "prop-1", requesterId: "user-1", answer: "30 dias" });

    expect(result.isLeft()).toBe(true);
    expect(result.value?.message).toContain("Falha ao enviar");
  });
});
