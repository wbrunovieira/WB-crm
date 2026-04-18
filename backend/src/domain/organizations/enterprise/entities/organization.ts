import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface OrganizationProps {
  ownerId: string;

  // Basic company info
  name: string;
  legalName?: string;
  foundationDate?: Date;

  // Contact Info
  website?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;

  // Location
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  streetAddress?: string;

  // Business Info
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  taxId?: string;
  description?: string;
  companyOwner?: string;
  companySize?: string;

  // Languages (JSON: [{code, isPrimary}])
  languages?: string;

  // CNAE
  primaryCNAEId?: string;
  internationalActivity?: string;

  // Social Media
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;

  // Lead tracking
  sourceLeadId?: string;

  // Partner referral
  referredByPartnerId?: string;

  // External Projects (JSON string array)
  externalProjectIds?: string;

  // Google Drive
  driveFolderId?: string;

  // Hosting
  hasHosting: boolean;
  hostingRenewalDate?: Date;
  hostingPlan?: string;
  hostingValue?: number;
  hostingReminderDays: number;
  hostingNotes?: string;

  // Operations transfer
  inOperationsAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export class Organization extends AggregateRoot<OrganizationProps> {
  get ownerId()               { return this.props.ownerId; }
  get name()                  { return this.props.name; }
  get legalName()             { return this.props.legalName; }
  get foundationDate()        { return this.props.foundationDate; }
  get website()               { return this.props.website; }
  get phone()                 { return this.props.phone; }
  get whatsapp()              { return this.props.whatsapp; }
  get email()                 { return this.props.email; }
  get country()               { return this.props.country; }
  get state()                 { return this.props.state; }
  get city()                  { return this.props.city; }
  get zipCode()               { return this.props.zipCode; }
  get streetAddress()         { return this.props.streetAddress; }
  get industry()              { return this.props.industry; }
  get employeeCount()         { return this.props.employeeCount; }
  get annualRevenue()         { return this.props.annualRevenue; }
  get taxId()                 { return this.props.taxId; }
  get description()           { return this.props.description; }
  get companyOwner()          { return this.props.companyOwner; }
  get companySize()           { return this.props.companySize; }
  get languages()             { return this.props.languages; }
  get primaryCNAEId()         { return this.props.primaryCNAEId; }
  get internationalActivity() { return this.props.internationalActivity; }
  get instagram()             { return this.props.instagram; }
  get linkedin()              { return this.props.linkedin; }
  get facebook()              { return this.props.facebook; }
  get twitter()               { return this.props.twitter; }
  get tiktok()                { return this.props.tiktok; }
  get sourceLeadId()            { return this.props.sourceLeadId; }
  get referredByPartnerId()     { return this.props.referredByPartnerId; }
  get externalProjectIds()      { return this.props.externalProjectIds; }
  get driveFolderId()         { return this.props.driveFolderId; }
  get hasHosting()            { return this.props.hasHosting; }
  get hostingRenewalDate()    { return this.props.hostingRenewalDate; }
  get hostingPlan()           { return this.props.hostingPlan; }
  get hostingValue()          { return this.props.hostingValue; }
  get hostingReminderDays()   { return this.props.hostingReminderDays; }
  get hostingNotes()          { return this.props.hostingNotes; }
  get inOperationsAt()        { return this.props.inOperationsAt; }
  get createdAt()             { return this.props.createdAt; }
  get updatedAt()             { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Omit<OrganizationProps, "ownerId" | "createdAt" | "updatedAt">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  static create(
    props: Omit<OrganizationProps, "hasHosting" | "hostingReminderDays" | "createdAt" | "updatedAt">
      & Partial<Pick<OrganizationProps, "hasHosting" | "hostingReminderDays" | "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Organization {
    const now = new Date();
    return new Organization(
      {
        hasHosting: false,
        hostingReminderDays: 30,
        createdAt: now,
        updatedAt: now,
        ...props,
      },
      id,
    );
  }
}
