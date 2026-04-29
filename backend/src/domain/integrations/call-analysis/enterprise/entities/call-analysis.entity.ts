import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface CallAnalysisProps {
  activityId: string;
  leadId?: string;
  ownerId: string;
  score?: number;
  noShowRisk?: string;
  noShowRiskText?: string;
  summary?: string;
  status: string;
  errorMsg?: string;
  jobId?: string;
  spicedSituation?: string;
  spicedPain?: string;
  spicedImpact?: string;
  spicedCritical?: string;
  spicedEvidence?: string;
  microPactos?: string;
  schedulingTechniques?: string;
  microAnalysis?: string;
  positivePoints?: string;
  improvementPoints?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CallAnalysis extends Entity<CallAnalysisProps> {
  static create(props: CallAnalysisProps, id?: UniqueEntityID): CallAnalysis {
    return new CallAnalysis(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    );
  }

  get activityId() {
    return this.props.activityId;
  }
  get leadId() {
    return this.props.leadId;
  }
  get ownerId() {
    return this.props.ownerId;
  }
  get score() {
    return this.props.score;
  }
  get noShowRisk() {
    return this.props.noShowRisk;
  }
  get noShowRiskText() {
    return this.props.noShowRiskText;
  }
  get summary() {
    return this.props.summary;
  }
  get status() {
    return this.props.status;
  }
  get errorMsg() {
    return this.props.errorMsg;
  }
  get jobId() {
    return this.props.jobId;
  }
  get spicedSituation() {
    return this.props.spicedSituation;
  }
  get spicedPain() {
    return this.props.spicedPain;
  }
  get spicedImpact() {
    return this.props.spicedImpact;
  }
  get spicedCritical() {
    return this.props.spicedCritical;
  }
  get spicedEvidence() {
    return this.props.spicedEvidence;
  }
  get microPactos() {
    return this.props.microPactos;
  }
  get schedulingTechniques() {
    return this.props.schedulingTechniques;
  }
  get microAnalysis() {
    return this.props.microAnalysis;
  }
  get positivePoints() {
    return this.props.positivePoints;
  }
  get improvementPoints() {
    return this.props.improvementPoints;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }

  complete(
    data: Partial<
      Omit<CallAnalysisProps, "activityId" | "ownerId" | "createdAt">
    >,
  ) {
    Object.assign(this.props, data, { updatedAt: new Date() });
  }
}
