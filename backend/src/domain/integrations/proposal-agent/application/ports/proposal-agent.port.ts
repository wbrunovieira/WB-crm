export interface ProposalContact {
  name: string;
  gender: "male" | "female" | "unknown";
}

export interface ProposalAgentTriggerPayload {
  proposalId: string;
  leadId: string;
  requesterId: string;
  brand: "wb" | "salto";
  contacts: ProposalContact[];
  instructions?: string;
  lead: {
    businessName: string;
    city?: string | null;
    state?: string | null;
    website?: string | null;
    description?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  };
  webhookUrl: string;
}

export interface ProposalAgentAnswerPayload {
  jobId: string;
  answer: string;
}

export interface ProposalAgentJobResponse {
  jobId: string;
  status: string;
}

export abstract class ProposalAgentPort {
  abstract trigger(payload: ProposalAgentTriggerPayload): Promise<{ jobId: string }>;
  abstract answer(payload: ProposalAgentAnswerPayload): Promise<void>;
}
