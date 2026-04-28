import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AgentDeepResearchPort, type LeadDeepResearchPayload, type LeadDeepResearchJobResponse } from "../application/ports/agent-deep-research.port";

@Injectable()
export class AgentDeepResearchHttpAdapter extends AgentDeepResearchPort {
  private readonly logger = new Logger(AgentDeepResearchHttpAdapter.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.baseUrl = config.get<string>("AGENTS_BASE_URL") ?? "https://agents.wbdigitalsolutions.com";
    this.secret = config.get<string>("WEBHOOK_SECRET") ?? "";
  }

  async request(payload: LeadDeepResearchPayload): Promise<LeadDeepResearchJobResponse> {
    const url = `${this.baseUrl}/agents/crm/lead-deep-research`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.secret ? { "X-Webhook-Secret": this.secret } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Agent service error ${res.status}: ${body}`);
      throw new Error(`Agent service respondeu com status ${res.status}`);
    }

    return res.json() as Promise<LeadDeepResearchJobResponse>;
  }
}
