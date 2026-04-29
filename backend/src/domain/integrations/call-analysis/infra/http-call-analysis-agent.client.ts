import { Injectable, Logger } from "@nestjs/common";
import {
  CallAnalysisAgentPort,
  type CallAnalysisPayload,
} from "../application/ports/call-analysis-agent.port";

@Injectable()
export class HttpCallAnalysisAgentClient extends CallAnalysisAgentPort {
  private readonly logger = new Logger(HttpCallAnalysisAgentClient.name);
  private readonly url = process.env.CALL_ANALYSIS_AGENT_URL ?? "";

  async request(payload: CallAnalysisPayload): Promise<void> {
    if (!this.url) {
      this.logger.warn("[CallAnalysis] CALL_ANALYSIS_AGENT_URL not configured, skipping");
      return;
    }

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Call analysis agent error ${res.status}: ${body}`);
      throw new Error(`Call analysis agent respondeu com status ${res.status}`);
    }
  }
}
