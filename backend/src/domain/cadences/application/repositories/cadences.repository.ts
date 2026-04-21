import { Cadence } from "../../enterprise/entities/cadence";
import { CadenceStep } from "../../enterprise/entities/cadence-step";

export interface LeadCadenceRecord {
  id: string;
  leadId: string;
  cadenceId: string;
  status: string;
  startDate: Date;
  currentStep: number;
  notes?: string;
  ownerId: string;
  pausedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface LeadCadenceActivity {
  id: string;
  scheduledDate: Date;
  cadenceStep: { dayNumber: number; channel: string; subject: string };
  activity: { id: string; completed: boolean; subject: string; dueDate: Date; failedAt?: Date | null; skippedAt?: Date | null };
}

export interface LeadCadenceDetail extends LeadCadenceRecord {
  cadence: { name: string; slug: string; durationDays: number; icp?: { id: string; name: string } | null };
  activities: LeadCadenceActivity[];
  progress: number;
  completedSteps: number;
  totalSteps: number;
}

export interface AvailableCadenceForLead {
  id: string;
  name: string;
  slug: string;
  durationDays: number;
  icp?: { id: string; name: string } | null;
  steps: Array<{ id: string; dayNumber: number; channel: string; subject: string }>;
  _count: { steps: number };
}

export interface ApplyCadenceInput {
  leadId: string;
  cadenceId: string;
  startDate: Date;
  ownerId: string;
  notes?: string;
}

export interface GeneratedActivity {
  leadCadenceId: string;
  cadenceStepId: string;
  activityId: string;
  scheduledDate: Date;
}

export abstract class CadencesRepository {
  // Cadence CRUD
  abstract findById(id: string): Promise<Cadence | null>;
  abstract findByOwner(ownerId: string): Promise<Cadence[]>;
  abstract existsBySlugAndOwner(slug: string, ownerId: string, excludeId?: string): Promise<boolean>;
  abstract save(cadence: Cadence): Promise<void>;
  abstract delete(id: string): Promise<void>;

  // Step CRUD
  abstract findStepsByCadence(cadenceId: string): Promise<CadenceStep[]>;
  abstract findStepById(id: string): Promise<CadenceStep | null>;
  abstract saveStep(step: CadenceStep): Promise<void>;
  abstract deleteStep(id: string): Promise<void>;
  abstract reorderSteps(cadenceId: string, orderedStepIds: string[]): Promise<void>;

  // LeadCadence ops
  abstract applyToLead(input: ApplyCadenceInput, steps: CadenceStep[]): Promise<{ leadCadenceId: string; activities: GeneratedActivity[] }>;
  abstract getLeadCadences(leadId: string): Promise<LeadCadenceRecord[]>;
  abstract getLeadCadencesDetail(leadId: string): Promise<LeadCadenceDetail[]>;
  abstract findLeadCadenceById(id: string): Promise<LeadCadenceRecord | null>;
  abstract pauseLeadCadence(id: string): Promise<void>;
  abstract resumeLeadCadence(id: string): Promise<void>;
  abstract cancelLeadCadence(id: string): Promise<void>;
  abstract completeLeadCadence(id: string, disqualificationReason?: string): Promise<void>;
  abstract cancelAllActiveCadencesByTemplate(cadenceId: string): Promise<{ cancelledIds: string[]; skippedActivitiesCount: number }>;
  abstract getAvailableCadencesForLead(leadId: string, ownerId: string): Promise<AvailableCadenceForLead[]>;
  abstract registerLeadReply(leadId: string, ownerId: string, channel: string, notes?: string): Promise<{ activityId: string; cancelledCadences: number; skippedActivities: number }>;
  abstract countActiveLeads(cadenceId: string): Promise<number>;
}
