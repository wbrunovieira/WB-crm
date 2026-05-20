import { ProposalAgentPort, type ProposalAgentTriggerPayload, type ProposalAgentAnswerPayload } from "@/domain/integrations/proposal-agent/application/ports/proposal-agent.port";

export class FakeProposalAgentPort extends ProposalAgentPort {
  public triggerCalls: ProposalAgentTriggerPayload[] = [];
  public answerCalls: ProposalAgentAnswerPayload[] = [];
  public shouldThrow = false;
  public jobIdToReturn = "fake-job-id";

  async trigger(payload: ProposalAgentTriggerPayload): Promise<{ jobId: string }> {
    if (this.shouldThrow) throw new Error("Agent unavailable");
    this.triggerCalls.push(payload);
    return { jobId: this.jobIdToReturn };
  }

  async answer(payload: ProposalAgentAnswerPayload): Promise<void> {
    if (this.shouldThrow) throw new Error("Agent unavailable");
    this.answerCalls.push(payload);
  }
}
