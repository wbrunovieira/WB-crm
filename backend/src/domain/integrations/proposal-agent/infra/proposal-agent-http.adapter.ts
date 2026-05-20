import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ProposalAgentPort,
  type ProposalAgentTriggerPayload,
  type ProposalAgentAnswerPayload,
  type ProposalAgentCorrectPayload,
  type ProposalAgentRevisePayload,
} from "../application/ports/proposal-agent.port";

@Injectable()
export class ProposalAgentHttpAdapter extends ProposalAgentPort {
  private readonly logger = new Logger(ProposalAgentHttpAdapter.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.baseUrl = config.get<string>("AGENTS_BASE_URL") ?? "https://agents.wbdigitalsolutions.com";
    this.secret = config.get<string>("WEBHOOK_SECRET") ?? "";
  }

  async trigger(payload: ProposalAgentTriggerPayload): Promise<{ jobId: string }> {
    const url = `${this.baseUrl}/agents/crm/proposal`;

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
      this.logger.error(`Proposal agent error ${res.status}: ${body}`);
      throw new Error(`Agent service respondeu com status ${res.status}`);
    }

    return res.json() as Promise<{ jobId: string }>;
  }

  async answer(payload: ProposalAgentAnswerPayload): Promise<void> {
    const url = `${this.baseUrl}/agents/crm/proposal/answer`;

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
      this.logger.error(`Proposal agent answer error ${res.status}: ${body}`);
      throw new Error(`Agent service respondeu com status ${res.status}`);
    }
  }

  async correct(payload: ProposalAgentCorrectPayload): Promise<{ jobId: string }> {
    const url = `${this.baseUrl}/agents/crm/proposal/correct`;

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
      this.logger.error(`Proposal agent correct error ${res.status}: ${body}`);
      throw new Error(`Agent service respondeu com status ${res.status}`);
    }

    return res.json() as Promise<{ jobId: string }>;
  }

  async revise(payload: ProposalAgentRevisePayload): Promise<{ jobId: string }> {
    const url = `${this.baseUrl}/agents/crm/proposal/revise`;

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
      this.logger.error(`Proposal agent revise error ${res.status}: ${body}`);
      throw new Error(`Agent service respondeu com status ${res.status}`);
    }

    return res.json() as Promise<{ jobId: string }>;
  }
}
