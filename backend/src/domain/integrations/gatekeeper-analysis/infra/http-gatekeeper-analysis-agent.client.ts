import { Injectable, Logger } from "@nestjs/common";
import {
  GatekeeperAnalysisAgentPort,
  type GatekeeperAnalysisPayload,
} from "../application/ports/gatekeeper-analysis-agent.port";

@Injectable()
export class HttpGatekeeperAnalysisAgentClient extends GatekeeperAnalysisAgentPort {
  private readonly logger = new Logger(HttpGatekeeperAnalysisAgentClient.name);
  private readonly url = process.env.GATEKEEPER_ANALYSIS_AGENT_URL ?? "";

  async request(payload: GatekeeperAnalysisPayload): Promise<void> {
    if (!this.url) {
      this.logger.warn("[GatekeeperAnalysis] GATEKEEPER_ANALYSIS_AGENT_URL not configured, skipping");
      return;
    }

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Gatekeeper analysis agent error ${res.status}: ${body}`);
      throw new Error(`Gatekeeper analysis agent respondeu com status ${res.status}`);
    }
  }
}
