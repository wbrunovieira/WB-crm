import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface GatekeeperAnalysisProps {
  activityId: string;
  ownerId: string;
  status: string;
  jobId?: string;
  score?: number;
  summary?: string;
  raportRecepcao?: string;
  raportAlianca?: string;
  raportPerguntas?: string;
  raportObjecoes?: string;
  raportResultado?: string;
  raportTecnicas?: string;
  positivePoints?: string;
  improvementPoints?: string;
  errorMsg?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GatekeeperAnalysis extends Entity<GatekeeperAnalysisProps> {
  static create(props: GatekeeperAnalysisProps, id?: UniqueEntityID): GatekeeperAnalysis {
    return new GatekeeperAnalysis(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    );
  }

  get activityId() { return this.props.activityId; }
  get ownerId() { return this.props.ownerId; }
  get status() { return this.props.status; }
  get jobId() { return this.props.jobId; }
  get score() { return this.props.score; }
  get summary() { return this.props.summary; }
  get raportRecepcao() { return this.props.raportRecepcao; }
  get raportAlianca() { return this.props.raportAlianca; }
  get raportPerguntas() { return this.props.raportPerguntas; }
  get raportObjecoes() { return this.props.raportObjecoes; }
  get raportResultado() { return this.props.raportResultado; }
  get raportTecnicas() { return this.props.raportTecnicas; }
  get positivePoints() { return this.props.positivePoints; }
  get improvementPoints() { return this.props.improvementPoints; }
  get errorMsg() { return this.props.errorMsg; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  complete(data: Partial<Omit<GatekeeperAnalysisProps, "activityId" | "ownerId" | "createdAt">>) {
    Object.assign(this.props, data, { updatedAt: new Date() });
  }
}
