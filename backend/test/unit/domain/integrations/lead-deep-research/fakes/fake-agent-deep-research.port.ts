import { AgentDeepResearchPort, type LeadDeepResearchPayload, type LeadDeepResearchJobResponse } from "@/domain/integrations/lead-deep-research/application/ports/agent-deep-research.port";

export class FakeAgentDeepResearchPort extends AgentDeepResearchPort {
  public calls: LeadDeepResearchPayload[] = [];
  public response: LeadDeepResearchJobResponse = { jobId: "job-001", status: "accepted" };
  public shouldThrow = false;

  async request(payload: LeadDeepResearchPayload): Promise<LeadDeepResearchJobResponse> {
    if (this.shouldThrow) throw new Error("Agent service unavailable");
    this.calls.push(payload);
    return this.response;
  }
}
