import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type ContactStatus = "active" | "inactive" | "bounced";

export interface ContactProps {
  ownerId: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  whatsappVerified: boolean;
  phoneValid?: boolean;
  phoneType?: string;
  whatsappPhoneValid?: boolean;
  whatsappPhoneType?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  emailVerificationStatus?: string;
  emailVerificationReason?: string;
  role?: string;
  department?: string;
  leadId?: string;
  organizationId?: string;
  partnerId?: string;
  linkedin?: string;
  instagram?: string;
  status: ContactStatus;
  isPrimary: boolean;
  birthDate?: Date;
  notes?: string;
  preferredLanguage: string;
  // Communication language for campaigns (pt|en|es|it); defaults to "pt"
  commLanguage: string;
  languages?: string; // JSON
  source?: string;
  sourceLeadContactId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Contact extends AggregateRoot<ContactProps> {
  get ownerId()               { return this.props.ownerId; }
  get name()                  { return this.props.name; }
  get email()                 { return this.props.email; }
  get phone()                 { return this.props.phone; }
  get whatsapp()              { return this.props.whatsapp; }
  get whatsappVerified()      { return this.props.whatsappVerified; }
  get phoneValid()            { return this.props.phoneValid; }
  get phoneType()             { return this.props.phoneType; }
  get whatsappPhoneValid()    { return this.props.whatsappPhoneValid; }
  get whatsappPhoneType()     { return this.props.whatsappPhoneType; }
  get emailVerified()         { return this.props.emailVerified; }
  get emailVerifiedAt()       { return this.props.emailVerifiedAt; }
  get emailVerificationStatus() { return this.props.emailVerificationStatus; }
  get emailVerificationReason() { return this.props.emailVerificationReason; }
  get role()                  { return this.props.role; }
  get department()            { return this.props.department; }
  get leadId()                { return this.props.leadId; }
  get organizationId()        { return this.props.organizationId; }
  get partnerId()             { return this.props.partnerId; }
  get linkedin()              { return this.props.linkedin; }
  get instagram()             { return this.props.instagram; }
  get status()                { return this.props.status; }
  get isPrimary()             { return this.props.isPrimary; }
  get birthDate()             { return this.props.birthDate; }
  get notes()                 { return this.props.notes; }
  get preferredLanguage()     { return this.props.preferredLanguage; }
  get commLanguage()          { return this.props.commLanguage; }
  get languages()             { return this.props.languages; }
  get source()                { return this.props.source; }
  get sourceLeadContactId()   { return this.props.sourceLeadContactId; }
  get createdAt()             { return this.props.createdAt; }
  get updatedAt()             { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  activate() {
    this.props.status = "active";
    this.touch();
  }

  deactivate() {
    this.props.status = "inactive";
    this.touch();
  }

  toggleStatus() {
    this.props.status = this.props.status === "active" ? "inactive" : "active";
    this.touch();
  }

  update(data: Partial<Omit<ContactProps, "ownerId" | "createdAt" | "updatedAt">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  static create(
    props: Omit<ContactProps, "whatsappVerified" | "isPrimary" | "preferredLanguage" | "commLanguage" | "status" | "createdAt" | "updatedAt">
      & Partial<Pick<ContactProps, "whatsappVerified" | "isPrimary" | "preferredLanguage" | "commLanguage" | "status" | "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Contact {
    const now = new Date();
    return new Contact(
      {
        whatsappVerified: false,
        isPrimary: false,
        preferredLanguage: "pt-BR",
        commLanguage: "pt",
        status: "active",
        createdAt: now,
        updatedAt: now,
        ...props,
      },
      id,
    );
  }
}
