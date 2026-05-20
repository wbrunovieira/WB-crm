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

export interface ProposalAgentCorrectPayload {
  proposalId: string;
  driveUrl: string;
  instructions: string;
  brand: "wb" | "salto";
  webhookUrl: string;
  lead: {
    businessName: string;
    city?: string | null;
    state?: string | null;
    website?: string | null;
  };
}

export interface ProposalAgentRevisePayload {
  proposalId: string;
  revisionNumber: number;
  driveUrl: string;
  revisionNotes: string;
  brand: "wb" | "salto";
  webhookUrl: string;
  lead: {
    businessName: string;
    city?: string | null;
    state?: string | null;
    website?: string | null;
  };
}

export interface ProposalAgentJobResponse {
  jobId: string;
  status: string;
}

export abstract class ProposalAgentPort {
  abstract trigger(payload: ProposalAgentTriggerPayload): Promise<{ jobId: string }>;
  abstract answer(payload: ProposalAgentAnswerPayload): Promise<void>;
  abstract correct(payload: ProposalAgentCorrectPayload): Promise<{ jobId: string }>;
  abstract revise(payload: ProposalAgentRevisePayload): Promise<{ jobId: string }>;
}
