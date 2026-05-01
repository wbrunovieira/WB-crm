import { Injectable, Logger } from "@nestjs/common";
import {
  GatekeeperBatchAgentPort,
  type GatekeeperBatchPayload,
} from "../application/ports/gatekeeper-batch-agent.port";

@Injectable()
export class HttpGatekeeperBatchAgentClient extends GatekeeperBatchAgentPort {
  private readonly logger = new Logger(HttpGatekeeperBatchAgentClient.name);
  private readonly url = process.env.GATEKEEPER_BATCH_AGENT_URL ?? "";

  async request(payload: GatekeeperBatchPayload): Promise<void> {
    if (!this.url) {
      this.logger.warn("[GatekeeperBatch] GATEKEEPER_BATCH_AGENT_URL not configured, skipping");
      return;
    }

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Gatekeeper batch agent error ${res.status}: ${body}`);
      throw new Error(`Gatekeeper batch agent respondeu com status ${res.status}`);
    }
  }
}
