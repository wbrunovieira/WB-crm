import { TransferAnalysisAgentPort, type TransferAnalysisPayload } from "@/domain/integrations/transfer-analysis/application/ports/transfer-analysis-agent.port";

export class FakeTransferAnalysisAgentPort extends TransferAnalysisAgentPort {
  calls: TransferAnalysisPayload[] = [];
  async request(payload: TransferAnalysisPayload): Promise<void> { this.calls.push(payload); }
}
