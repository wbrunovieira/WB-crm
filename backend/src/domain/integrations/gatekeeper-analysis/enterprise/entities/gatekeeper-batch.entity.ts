import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface GatekeeperBatchProps {
  ownerId: string;
  status: string;
  jobId?: string;
  analysisIds?: string;
  overallScore?: number;
  dimensionAverages?: string;
  patterns?: string;
  comparisonWithHistory?: string;
  individualHighlights?: string;
  recommendations?: string;
  newSummary?: string;
  positivePoints?: string;
  improvementPoints?: string;
  errorMsg?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GatekeeperBatch extends Entity<GatekeeperBatchProps> {
  static create(props: GatekeeperBatchProps, id?: UniqueEntityID): GatekeeperBatch {
    return new GatekeeperBatch(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    );
  }

  get ownerId() { return this.props.ownerId; }
  get status() { return this.props.status; }
  get jobId() { return this.props.jobId; }
  get analysisIds() { return this.props.analysisIds; }
  get overallScore() { return this.props.overallScore; }
  get dimensionAverages() { return this.props.dimensionAverages; }
  get patterns() { return this.props.patterns; }
  get comparisonWithHistory() { return this.props.comparisonWithHistory; }
  get individualHighlights() { return this.props.individualHighlights; }
  get recommendations() { return this.props.recommendations; }
  get newSummary() { return this.props.newSummary; }
  get positivePoints() { return this.props.positivePoints; }
  get improvementPoints() { return this.props.improvementPoints; }
  get errorMsg() { return this.props.errorMsg; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  complete(data: Partial<Omit<GatekeeperBatchProps, "ownerId" | "createdAt">>) {
    Object.assign(this.props, data, { updatedAt: new Date() });
  }
}
