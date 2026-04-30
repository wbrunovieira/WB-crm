import {
  MeetAnalysisAgentPort,
  type MeetAnalysisPayload,
} from "@/domain/integrations/meet-analysis/application/ports/meet-analysis-agent.port";

export class FakeMeetAnalysisAgentPort extends MeetAnalysisAgentPort {
  calls: MeetAnalysisPayload[] = [];

  async request(payload: MeetAnalysisPayload): Promise<void> {
    this.calls.push(payload);
  }
}
