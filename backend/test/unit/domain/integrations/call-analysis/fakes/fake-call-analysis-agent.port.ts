import {
  CallAnalysisAgentPort,
  type CallAnalysisPayload,
} from "@/domain/integrations/call-analysis/application/ports/call-analysis-agent.port";

export class FakeCallAnalysisAgentPort extends CallAnalysisAgentPort {
  public calls: CallAnalysisPayload[] = [];
  public shouldThrow = false;

  async request(payload: CallAnalysisPayload): Promise<void> {
    if (this.shouldThrow) throw new Error("Call analysis agent unavailable");
    this.calls.push(payload);
  }
}
