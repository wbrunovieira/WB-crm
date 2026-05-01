import { GatekeeperBatchAgentPort, type GatekeeperBatchPayload } from "@/domain/integrations/gatekeeper-analysis/application/ports/gatekeeper-batch-agent.port";

export class FakeGatekeeperBatchAgentPort extends GatekeeperBatchAgentPort {
  calls: GatekeeperBatchPayload[] = [];
  async request(payload: GatekeeperBatchPayload): Promise<void> { this.calls.push(payload); }
}
