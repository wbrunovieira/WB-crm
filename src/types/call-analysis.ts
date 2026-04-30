export interface SpicedDimension {
  text: string;
  score: number;
  highlights?: string[];
}

export interface MicroPacto {
  id: number;
  label: string;
  spicedDimension: string;
  achieved: boolean;
  notes: string;
}

export interface SchedulingTechniqueEntry {
  used: boolean;
  notes: string;
}

export type SchedulingTechniques = Record<string, SchedulingTechniqueEntry>;

export interface MicroAnalysisEntry {
  moment: string;
  observation: string;
  impact: "positive" | "negative" | "neutral";
}

export interface CallAnalysis {
  id: string;
  activityId: string;
  leadId: string | null;
  ownerId: string;
  score: number | null;
  noShowRisk: "BAIXO" | "MÉDIO" | "ALTO" | null;
  noShowRiskText: string | null;
  summary: string | null;
  status: "pending" | "processing" | "completed" | "error";
  errorMsg: string | null;
  jobId: string | null;
  spicedSituation: SpicedDimension | null;
  spicedPain: SpicedDimension | null;
  spicedImpact: SpicedDimension | null;
  spicedCritical: SpicedDimension | null;
  spicedEvidence: SpicedDimension | null;
  microPactos: MicroPacto[] | null;
  schedulingTechniques: SchedulingTechniques | null;
  microAnalysis: MicroAnalysisEntry[] | null;
  positivePoints: string[] | null;
  improvementPoints: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}
