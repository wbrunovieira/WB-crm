import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { ProposalTitle } from "../value-objects/proposal-title.vo";
import { ProposalStatus } from "../value-objects/proposal-status.vo";

export interface ProposalProps {
  title: ProposalTitle;
  description?: string;
  status: ProposalStatus;
  driveFileId?: string;
  driveUrl?: string;
  fileName?: string;
  fileSize?: number;
  sentAt?: Date;
  leadId?: string;
  dealId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Proposal extends AggregateRoot<ProposalProps> {
  get title(): string { return this.props.title.value; }
  get description(): string | undefined { return this.props.description; }
  get status(): string { return this.props.status.value; }
  get driveFileId(): string | undefined { return this.props.driveFileId; }
  get driveUrl(): string | undefined { return this.props.driveUrl; }
  get fileName(): string | undefined { return this.props.fileName; }
  get fileSize(): number | undefined { return this.props.fileSize; }
  get sentAt(): Date | undefined { return this.props.sentAt; }
  get leadId(): string | undefined { return this.props.leadId; }
  get dealId(): string | undefined { return this.props.dealId; }
  get ownerId(): string { return this.props.ownerId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(data: {
    title: string;
    description?: string;
    status?: string;
    driveFileId?: string;
    driveUrl?: string;
    fileName?: string;
    fileSize?: number;
    sentAt?: Date;
    leadId?: string;
    dealId?: string;
    ownerId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }, id?: UniqueEntityID): Either<Error, Proposal> {
    const titleResult = ProposalTitle.create(data.title);
    if (titleResult.isLeft()) return left(titleResult.value);

    const statusResult: Either<Error, ProposalStatus> = data.status
      ? ProposalStatus.create(data.status)
      : right(ProposalStatus.draft());
    if (statusResult.isLeft()) return left(statusResult.value);

    const now = new Date();
    const sentAt = data.sentAt ?? (statusResult.value.value === "sent" ? now : undefined);
    return right(new Proposal({
      title: titleResult.value as ProposalTitle,
      description: data.description,
      status: statusResult.value as ProposalStatus,
      driveFileId: data.driveFileId,
      driveUrl: data.driveUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      sentAt,
      leadId: data.leadId,
      dealId: data.dealId,
      ownerId: data.ownerId,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    }, id));
  }

  update(data: {
    title?: string;
    description?: string;
    status?: string;
    driveFileId?: string;
    driveUrl?: string;
    fileName?: string;
    fileSize?: number;
    leadId?: string;
    dealId?: string;
  }): Either<Error, void> {
    if (data.title !== undefined) {
      const r = ProposalTitle.create(data.title);
      if (r.isLeft()) return left(r.value);
      this.props.title = r.value as ProposalTitle;
    }
    if (data.status !== undefined) {
      const r = ProposalStatus.create(data.status);
      if (r.isLeft()) return left(r.value);
      this.props.status = r.value as ProposalStatus;
      if (data.status === "sent" && !this.props.sentAt) {
        this.props.sentAt = new Date();
      }
    }
    if (data.description !== undefined) this.props.description = data.description;
    if (data.driveFileId !== undefined) this.props.driveFileId = data.driveFileId;
    if (data.driveUrl !== undefined) this.props.driveUrl = data.driveUrl;
    if (data.fileName !== undefined) this.props.fileName = data.fileName;
    if (data.fileSize !== undefined) this.props.fileSize = data.fileSize;
    if (data.leadId !== undefined) this.props.leadId = data.leadId;
    if (data.dealId !== undefined) this.props.dealId = data.dealId;
    this.props.updatedAt = new Date();
    return right(undefined);
  }
}
