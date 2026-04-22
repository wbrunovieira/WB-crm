export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
export type StepType = "TEXT" | "MEDIA" | "AUDIO" | "DELAY" | "TYPING";
export type SendStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "OPTED_OUT";

export interface Campaign {
  id: string;
  ownerId: string;
  name: string;
  instanceName: string;
  description?: string;
  status: CampaignStatus;
  antiBlockConfig?: string;
  stepsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStep {
  id: string;
  campaignId: string;
  order: number;
  type: StepType;
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: string;
  delaySeconds?: number;
  typingSeconds?: number;
}

export interface CampaignSend {
  id: string;
  phone: string;
  leadId?: string;
  status: SendStatus;
  currentStep: number;
  scheduledAt?: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface CampaignDetail extends Campaign {
  sends: CampaignSend[];
}
