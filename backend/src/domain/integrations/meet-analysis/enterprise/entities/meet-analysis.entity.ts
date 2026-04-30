import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface MeetAnalysisProps {
  activityId: string;
  leadId?: string;
  ownerId: string;
  score?: number;
  summary?: string;
  nextStep?: string;
  status: string;
  errorMsg?: string;
  jobId?: string;
  diagBusiness?: string;
  diagGaps?: string;
  diagUrgency?: string;
  diagDecisionPower?: string;
  diagEngagement?: string;
  diagClosing?: string;
  positivePoints?: string;
  improvementPoints?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MeetAnalysis extends Entity<MeetAnalysisProps> {
  static create(props: MeetAnalysisProps, id?: UniqueEntityID): MeetAnalysis {
    return new MeetAnalysis(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    );
  }

  get activityId() { return this.props.activityId; }
  get leadId() { return this.props.leadId; }
  get ownerId() { return this.props.ownerId; }
  get score() { return this.props.score; }
  get summary() { return this.props.summary; }
  get nextStep() { return this.props.nextStep; }
  get status() { return this.props.status; }
  get errorMsg() { return this.props.errorMsg; }
  get jobId() { return this.props.jobId; }
  get diagBusiness() { return this.props.diagBusiness; }
  get diagGaps() { return this.props.diagGaps; }
  get diagUrgency() { return this.props.diagUrgency; }
  get diagDecisionPower() { return this.props.diagDecisionPower; }
  get diagEngagement() { return this.props.diagEngagement; }
  get diagClosing() { return this.props.diagClosing; }
  get positivePoints() { return this.props.positivePoints; }
  get improvementPoints() { return this.props.improvementPoints; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  complete(data: Partial<Omit<MeetAnalysisProps, "activityId" | "ownerId" | "createdAt">>) {
    Object.assign(this.props, data, { updatedAt: new Date() });
  }
}
