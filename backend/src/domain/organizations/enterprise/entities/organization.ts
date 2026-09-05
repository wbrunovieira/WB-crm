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

  // Communication language for campaigns (pt|en|es|it); defaults to "pt"
  commLanguage: string;

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
  // Paridade com o Lead — herdados na conversão (GPS, Google Places, verificações, agente IA).
  activityOrder?: string;
  agentResearchAt?: Date;
  agentSummary?: string;
  agentUpdatedFields?: string;
  businessStatus?: string;
  categories?: string;
  category?: string;
  emailVerificationReason?: string;
  emailVerificationStatus?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  equityCapital?: number;
  fieldsFilled?: number;
  googleAds?: string;
  googleId?: string;
  googleMapsUrl?: string;
  isProspect?: boolean;
  latitude?: number;
  longitude?: number;
  metaAds?: string;
  notes?: string;
  openingHours?: string;
  permanentlyClosed?: boolean;
  phone2Type?: string;
  phone2Valid?: boolean;
  phoneType?: string;
  phoneValid?: boolean;
  priceLevel?: number;
  quality?: string;
  radius?: number;
  rating?: number;
  searchTerm?: string;
  socialMedia?: string;
  source?: string;
  starRating?: number;
  status?: string;
  types?: string;
  userRatingsTotal?: number;
  vicinity?: string;
  whatsappPhoneType?: string;
  whatsappPhoneValid?: boolean;
  whatsappVerified?: boolean;
  whatsappVerifiedAt?: Date;
  whatsappVerifiedNumber?: string;
  sourceLeadId?: string;
  /** When this customer stopped being a lead. Null for organizations created directly. */
  convertedAt?: Date;

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

  // Dados fiscais e jurídicos (espelhados do Lead)
  segment?: string;
  legalNature?: string;
  branchType?: string;
  simplesNacional?: boolean;
  isMei?: boolean;
  revenueRange?: string;
  phone2?: string;

  // Grouping / import tag
  sourceGroup?: string;

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
  get commLanguage()          { return this.props.commLanguage; }
  get primaryCNAEId()         { return this.props.primaryCNAEId; }
  get internationalActivity() { return this.props.internationalActivity; }
  get instagram()             { return this.props.instagram; }
  get linkedin()              { return this.props.linkedin; }
  get facebook()              { return this.props.facebook; }
  get twitter()               { return this.props.twitter; }
  get tiktok()                { return this.props.tiktok; }
  get activityOrder           () { return this.props.activityOrder; }
  get agentResearchAt         () { return this.props.agentResearchAt; }
  get agentSummary            () { return this.props.agentSummary; }
  get agentUpdatedFields      () { return this.props.agentUpdatedFields; }
  get businessStatus          () { return this.props.businessStatus; }
  get categories              () { return this.props.categories; }
  get category                () { return this.props.category; }
  get emailVerificationReason () { return this.props.emailVerificationReason; }
  get emailVerificationStatus () { return this.props.emailVerificationStatus; }
  get emailVerified           () { return this.props.emailVerified; }
  get emailVerifiedAt         () { return this.props.emailVerifiedAt; }
  get equityCapital           () { return this.props.equityCapital; }
  get fieldsFilled            () { return this.props.fieldsFilled; }
  get googleAds               () { return this.props.googleAds; }
  get googleId                () { return this.props.googleId; }
  get googleMapsUrl           () { return this.props.googleMapsUrl; }
  get isProspect              () { return this.props.isProspect; }
  get latitude                () { return this.props.latitude; }
  get longitude               () { return this.props.longitude; }
  get metaAds                 () { return this.props.metaAds; }
  get notes                   () { return this.props.notes; }
  get openingHours            () { return this.props.openingHours; }
  get permanentlyClosed       () { return this.props.permanentlyClosed; }
  get phone2Type              () { return this.props.phone2Type; }
  get phone2Valid             () { return this.props.phone2Valid; }
  get phoneType               () { return this.props.phoneType; }
  get phoneValid              () { return this.props.phoneValid; }
  get priceLevel              () { return this.props.priceLevel; }
  get quality                 () { return this.props.quality; }
  get radius                  () { return this.props.radius; }
  get rating                  () { return this.props.rating; }
  get searchTerm              () { return this.props.searchTerm; }
  get socialMedia             () { return this.props.socialMedia; }
  get source                  () { return this.props.source; }
  get starRating              () { return this.props.starRating; }
  get status                  () { return this.props.status; }
  get types                   () { return this.props.types; }
  get userRatingsTotal        () { return this.props.userRatingsTotal; }
  get vicinity                () { return this.props.vicinity; }
  get whatsappPhoneType       () { return this.props.whatsappPhoneType; }
  get whatsappPhoneValid      () { return this.props.whatsappPhoneValid; }
  get whatsappVerified        () { return this.props.whatsappVerified; }
  get whatsappVerifiedAt      () { return this.props.whatsappVerifiedAt; }
  get whatsappVerifiedNumber  () { return this.props.whatsappVerifiedNumber; }
  get sourceLeadId()            { return this.props.sourceLeadId; }
  get convertedAt()             { return this.props.convertedAt; }
  get referredByPartnerId()     { return this.props.referredByPartnerId; }
  get externalProjectIds()      { return this.props.externalProjectIds; }
  get driveFolderId()         { return this.props.driveFolderId; }
  get hasHosting()            { return this.props.hasHosting; }
  get hostingRenewalDate()    { return this.props.hostingRenewalDate; }
  get hostingPlan()           { return this.props.hostingPlan; }
  get hostingValue()          { return this.props.hostingValue; }
  get hostingReminderDays()   { return this.props.hostingReminderDays; }
  get hostingNotes()          { return this.props.hostingNotes; }
  get segment()               { return this.props.segment; }
  get legalNature()           { return this.props.legalNature; }
  get branchType()            { return this.props.branchType; }
  get simplesNacional()       { return this.props.simplesNacional; }
  get isMei()                 { return this.props.isMei; }
  get revenueRange()          { return this.props.revenueRange; }
  get phone2()                { return this.props.phone2; }
  get sourceGroup()           { return this.props.sourceGroup; }
  get inOperationsAt()        { return this.props.inOperationsAt; }
  get createdAt()             { return this.props.createdAt; }
  get updatedAt()             { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Omit<OrganizationProps, "ownerId" | "createdAt" | "updatedAt">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  static create(
    props: Omit<OrganizationProps, "hasHosting" | "hostingReminderDays" | "commLanguage" | "createdAt" | "updatedAt">
      & Partial<Pick<OrganizationProps, "hasHosting" | "hostingReminderDays" | "commLanguage" | "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Organization {
    const now = new Date();
    return new Organization(
      {
        hasHosting: false,
        hostingReminderDays: 30,
        commLanguage: "pt",
        createdAt: now,
        updatedAt: now,
        ...props,
      },
      id,
    );
  }
}
