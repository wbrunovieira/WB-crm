import {
  ProposalAgentPort,
  type ProposalAgentTriggerPayload,
  type ProposalAgentAnswerPayload,
  type ProposalAgentCorrectPayload,
  type ProposalAgentRevisePayload,
} from "@/domain/integrations/proposal-agent/application/ports/proposal-agent.port";

export class FakeProposalAgentPort extends ProposalAgentPort {
  public triggerCalls: ProposalAgentTriggerPayload[] = [];
  public answerCalls: ProposalAgentAnswerPayload[] = [];
  public correctCalls: ProposalAgentCorrectPayload[] = [];
  public reviseCalls: ProposalAgentRevisePayload[] = [];
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

  async correct(payload: ProposalAgentCorrectPayload): Promise<{ jobId: string }> {
    if (this.shouldThrow) throw new Error("Agent unavailable");
    this.correctCalls.push(payload);
    return { jobId: this.jobIdToReturn };
  }

  async revise(payload: ProposalAgentRevisePayload): Promise<{ jobId: string }> {
    if (this.shouldThrow) throw new Error("Agent unavailable");
    this.reviseCalls.push(payload);
    return { jobId: this.jobIdToReturn };
  }
}
