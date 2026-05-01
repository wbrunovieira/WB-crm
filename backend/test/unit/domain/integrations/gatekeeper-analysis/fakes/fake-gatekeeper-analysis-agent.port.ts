import { GatekeeperAnalysisAgentPort, type GatekeeperAnalysisPayload } from "@/domain/integrations/gatekeeper-analysis/application/ports/gatekeeper-analysis-agent.port";

export class FakeGatekeeperAnalysisAgentPort extends GatekeeperAnalysisAgentPort {
  calls: GatekeeperAnalysisPayload[] = [];
  async request(payload: GatekeeperAnalysisPayload): Promise<void> { this.calls.push(payload); }
}
