import { Injectable, Logger } from "@nestjs/common";
import {
  TransferAnalysisAgentPort,
  type TransferAnalysisPayload,
} from "../application/ports/transfer-analysis-agent.port";

@Injectable()
export class HttpTransferAnalysisAgentClient extends TransferAnalysisAgentPort {
  private readonly logger = new Logger(HttpTransferAnalysisAgentClient.name);
  private readonly url = process.env.TRANSFER_ANALYSIS_AGENT_URL ?? "";

  async request(payload: TransferAnalysisPayload): Promise<void> {
    if (!this.url) {
      this.logger.warn("[TransferAnalysis] TRANSFER_ANALYSIS_AGENT_URL not configured, skipping");
      return;
    }

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Transfer analysis agent error ${res.status}: ${body}`);
      throw new Error(`Transfer analysis agent respondeu com status ${res.status}`);
    }
  }
}
