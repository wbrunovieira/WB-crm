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
  abstract findLeadCadenceById(id: string): Promise<LeadCadenceRecord | null>;
  abstract pauseLeadCadence(id: string): Promise<void>;
  abstract resumeLeadCadence(id: string): Promise<void>;
  abstract cancelLeadCadence(id: string): Promise<void>;
  abstract countActiveLeads(cadenceId: string): Promise<number>;
}
