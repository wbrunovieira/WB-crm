import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface ActivityProps {
  ownerId: string;
  type: string; // call, meeting, email, task, whatsapp, physical_visit, instagram_dm
  subject: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;

  // Outcome
  failedAt?: Date;
  failReason?: string;
  skippedAt?: Date;
  skipReason?: string;

  // Links
  dealId?: string;
  additionalDealIds?: string; // JSON string
  contactId?: string;
  contactIds?: string; // JSON string
  leadContactIds?: string; // JSON string
  leadId?: string;
  partnerId?: string;

  // GoTo Call
  gotoCallId?: string;
  gotoRecordingId?: string;
  gotoRecordingDriveId?: string;
  gotoRecordingUrl?: string;
  gotoRecordingUrl2?: string;
  gotoTranscriptionJobId?: string;
  gotoTranscriptionJobId2?: string;
  gotoTranscriptText?: string;
  gotoCallOutcome?: string;
  gotoDuration?: number;
  callContactType?: string;
  meetingNoShow: boolean;

  // Email
  emailMessageId?: string;
  emailThreadId?: string;
  emailSubject?: string;
  emailFromAddress?: string;
  emailFromName?: string;
  emailReplied: boolean;
  emailTrackingToken?: string;
  emailOpenCount: number;
  emailOpenedAt?: Date;
  emailLastOpenedAt?: Date;
  emailLinkClickCount: number;
  emailLinkClickedAt?: Date;
  emailLastLinkClickedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export class Activity extends AggregateRoot<ActivityProps> {
  get ownerId()              { return this.props.ownerId; }
  get type()                 { return this.props.type; }
  get subject()              { return this.props.subject; }
  get description()          { return this.props.description; }
  get dueDate()              { return this.props.dueDate; }
  get completed()            { return this.props.completed; }
  get completedAt()          { return this.props.completedAt; }
  get failedAt()             { return this.props.failedAt; }
  get failReason()           { return this.props.failReason; }
  get skippedAt()            { return this.props.skippedAt; }
  get skipReason()           { return this.props.skipReason; }
  get dealId()               { return this.props.dealId; }
  get additionalDealIds()    { return this.props.additionalDealIds; }
  get contactId()            { return this.props.contactId; }
  get contactIds()           { return this.props.contactIds; }
  get leadContactIds()       { return this.props.leadContactIds; }
  get leadId()               { return this.props.leadId; }
  get partnerId()            { return this.props.partnerId; }
  get gotoCallId()           { return this.props.gotoCallId; }
  get gotoRecordingId()      { return this.props.gotoRecordingId; }
  get gotoRecordingDriveId() { return this.props.gotoRecordingDriveId; }
  get gotoRecordingUrl()     { return this.props.gotoRecordingUrl; }
  get gotoRecordingUrl2()    { return this.props.gotoRecordingUrl2; }
  get gotoTranscriptionJobId()  { return this.props.gotoTranscriptionJobId; }
  get gotoTranscriptionJobId2() { return this.props.gotoTranscriptionJobId2; }
  get gotoTranscriptText()   { return this.props.gotoTranscriptText; }
  get gotoCallOutcome()      { return this.props.gotoCallOutcome; }
  get gotoDuration()         { return this.props.gotoDuration; }
  get callContactType()      { return this.props.callContactType; }
  get meetingNoShow()        { return this.props.meetingNoShow; }
  get emailMessageId()       { return this.props.emailMessageId; }
  get emailThreadId()        { return this.props.emailThreadId; }
  get emailSubject()         { return this.props.emailSubject; }
  get emailFromAddress()     { return this.props.emailFromAddress; }
  get emailFromName()        { return this.props.emailFromName; }
  get emailReplied()         { return this.props.emailReplied; }
  get emailTrackingToken()   { return this.props.emailTrackingToken; }
  get emailOpenCount()       { return this.props.emailOpenCount; }
  get emailOpenedAt()        { return this.props.emailOpenedAt; }
  get emailLastOpenedAt()    { return this.props.emailLastOpenedAt; }
  get emailLinkClickCount()  { return this.props.emailLinkClickCount; }
  get emailLinkClickedAt()   { return this.props.emailLinkClickedAt; }
  get emailLastLinkClickedAt() { return this.props.emailLastLinkClickedAt; }
  get createdAt()            { return this.props.createdAt; }
  get updatedAt()            { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Omit<ActivityProps, "ownerId" | "createdAt" | "updatedAt">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  toggleCompleted() {
    this.props.completed = !this.props.completed;
    this.props.completedAt = this.props.completed ? new Date() : undefined;
    this.touch();
  }

  fail(reason: string) {
    this.props.failedAt = new Date();
    this.props.failReason = reason;
    this.props.skippedAt = undefined;
    this.props.skipReason = undefined;
    this.touch();
  }

  skip(reason: string) {
    this.props.skippedAt = new Date();
    this.props.skipReason = reason;
    this.props.failedAt = undefined;
    this.props.failReason = undefined;
    this.touch();
  }

  revertOutcome() {
    this.props.failedAt = undefined;
    this.props.failReason = undefined;
    this.props.skippedAt = undefined;
    this.props.skipReason = undefined;
    this.touch();
  }

  linkDeal(dealId: string) {
    const existing: string[] = this.props.additionalDealIds
      ? JSON.parse(this.props.additionalDealIds)
      : [];
    if (!existing.includes(dealId)) {
      existing.push(dealId);
      this.props.additionalDealIds = JSON.stringify(existing);
    }
    this.touch();
  }

  unlinkDeal(dealId: string) {
    const existing: string[] = this.props.additionalDealIds
      ? JSON.parse(this.props.additionalDealIds)
      : [];
    this.props.additionalDealIds = JSON.stringify(existing.filter((id) => id !== dealId));
    this.touch();
  }

  static create(
    props: Omit<ActivityProps, "createdAt" | "updatedAt"> & Partial<Pick<ActivityProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Activity {
    const now = new Date();
    return new Activity({ createdAt: now, updatedAt: now, ...props }, id);
  }
}
