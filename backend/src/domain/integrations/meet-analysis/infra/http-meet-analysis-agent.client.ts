import { Injectable, Logger } from "@nestjs/common";
import {
  MeetAnalysisAgentPort,
  type MeetAnalysisPayload,
} from "../application/ports/meet-analysis-agent.port";

@Injectable()
export class HttpMeetAnalysisAgentClient extends MeetAnalysisAgentPort {
  private readonly logger = new Logger(HttpMeetAnalysisAgentClient.name);
  private readonly url = process.env.MEET_ANALYSIS_AGENT_URL ?? "";

  async request(payload: MeetAnalysisPayload): Promise<void> {
    if (!this.url) {
      this.logger.warn("[MeetAnalysis] MEET_ANALYSIS_AGENT_URL not configured, skipping");
      return;
    }

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Meet analysis agent error ${res.status}: ${body}`);
      throw new Error(`Meet analysis agent respondeu com status ${res.status}`);
    }
  }
}
