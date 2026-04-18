import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface LeadProps {
  ownerId: string;

  // Basic company info
  businessName: string;
  registeredName?: string;
  foundationDate?: Date;
  companyRegistrationID?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  vicinity?: string;

  // Contact
  phone?: string;
  whatsapp?: string;
  whatsappVerified: boolean;
  whatsappVerifiedAt?: Date;
  whatsappVerifiedNumber?: string;
  website?: string;
  email?: string;

  // Social media
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;

  // Google Places info
  googleId?: string;
  categories?: string;
  rating?: number;
  priceLevel?: number;
  userRatingsTotal?: number;
  permanentlyClosed: boolean;
  types?: string;

  // Company info
  companyOwner?: string;
  companySize?: string;
  revenue?: number;
  employeesCount?: number;
  description?: string;
  equityCapital?: number;
  businessStatus?: string;

  // Languages (JSON)
  languages?: string;

  // Activities (deprecated — use CNAE)
  primaryActivity?: string;
  secondaryActivities?: string;

  // CNAE
  primaryCNAEId?: string;
  internationalActivity?: string;

  // Search metadata
  source?: string;
  quality?: string;
  searchTerm?: string;
  fieldsFilled?: number;
  category?: string;
  radius?: number;

  // Digital presence
  socialMedia?: string;
  metaAds?: string;
  googleAds?: string;

  // Priority
  starRating?: number;

  // Geo
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  openingHours?: string; // JSON

  // Google Places Search session
  googlePlacesSearchId?: string;

  // Status & conversion
  status: string;
  isArchived: boolean;
  archivedAt?: Date;
  archivedReason?: string;
  isProspect: boolean;
  convertedAt?: Date;
  convertedToOrganizationId?: string;

  // Referral
  referredByPartnerId?: string;

  // Custom activity order (JSON)
  activityOrder?: string;

  // Google Drive
  driveFolderId?: string;

  // Operations transfer
  inOperationsAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export class Lead extends AggregateRoot<LeadProps> {
  get ownerId()                     { return this.props.ownerId; }
  get businessName()                { return this.props.businessName; }
  get registeredName()              { return this.props.registeredName; }
  get foundationDate()              { return this.props.foundationDate; }
  get companyRegistrationID()       { return this.props.companyRegistrationID; }
  get address()                     { return this.props.address; }
  get city()                        { return this.props.city; }
  get state()                       { return this.props.state; }
  get country()                     { return this.props.country; }
  get zipCode()                     { return this.props.zipCode; }
  get vicinity()                    { return this.props.vicinity; }
  get phone()                       { return this.props.phone; }
  get whatsapp()                    { return this.props.whatsapp; }
  get whatsappVerified()            { return this.props.whatsappVerified; }
  get whatsappVerifiedAt()          { return this.props.whatsappVerifiedAt; }
  get whatsappVerifiedNumber()      { return this.props.whatsappVerifiedNumber; }
  get website()                     { return this.props.website; }
  get email()                       { return this.props.email; }
  get instagram()                   { return this.props.instagram; }
  get linkedin()                    { return this.props.linkedin; }
  get facebook()                    { return this.props.facebook; }
  get twitter()                     { return this.props.twitter; }
  get tiktok()                      { return this.props.tiktok; }
  get googleId()                    { return this.props.googleId; }
  get categories()                  { return this.props.categories; }
  get rating()                      { return this.props.rating; }
  get priceLevel()                  { return this.props.priceLevel; }
  get userRatingsTotal()            { return this.props.userRatingsTotal; }
  get permanentlyClosed()           { return this.props.permanentlyClosed; }
  get types()                       { return this.props.types; }
  get companyOwner()                { return this.props.companyOwner; }
  get companySize()                 { return this.props.companySize; }
  get revenue()                     { return this.props.revenue; }
  get employeesCount()              { return this.props.employeesCount; }
  get description()                 { return this.props.description; }
  get equityCapital()               { return this.props.equityCapital; }
  get businessStatus()              { return this.props.businessStatus; }
  get languages()                   { return this.props.languages; }
  get primaryActivity()             { return this.props.primaryActivity; }
  get secondaryActivities()         { return this.props.secondaryActivities; }
  get primaryCNAEId()               { return this.props.primaryCNAEId; }
  get internationalActivity()       { return this.props.internationalActivity; }
  get source()                      { return this.props.source; }
  get quality()                     { return this.props.quality; }
  get searchTerm()                  { return this.props.searchTerm; }
  get fieldsFilled()                { return this.props.fieldsFilled; }
  get category()                    { return this.props.category; }
  get radius()                      { return this.props.radius; }
  get socialMedia()                 { return this.props.socialMedia; }
  get metaAds()                     { return this.props.metaAds; }
  get googleAds()                   { return this.props.googleAds; }
  get starRating()                  { return this.props.starRating; }
  get latitude()                    { return this.props.latitude; }
  get longitude()                   { return this.props.longitude; }
  get googleMapsUrl()               { return this.props.googleMapsUrl; }
  get openingHours()                { return this.props.openingHours; }
  get googlePlacesSearchId()        { return this.props.googlePlacesSearchId; }
  get status()                      { return this.props.status; }
  get isArchived()                  { return this.props.isArchived; }
  get archivedAt()                  { return this.props.archivedAt; }
  get archivedReason()              { return this.props.archivedReason; }
  get isProspect()                  { return this.props.isProspect; }
  get convertedAt()                 { return this.props.convertedAt; }
  get convertedToOrganizationId()   { return this.props.convertedToOrganizationId; }
  get referredByPartnerId()         { return this.props.referredByPartnerId; }
  get activityOrder()               { return this.props.activityOrder; }
  get driveFolderId()               { return this.props.driveFolderId; }
  get inOperationsAt()              { return this.props.inOperationsAt; }
  get createdAt()                   { return this.props.createdAt; }
  get updatedAt()                   { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Omit<LeadProps, "ownerId" | "createdAt" | "updatedAt">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  archive(reason?: string) {
    this.props.isArchived = true;
    this.props.archivedAt = new Date();
    this.props.archivedReason = reason;
    this.touch();
  }

  unarchive() {
    this.props.isArchived = false;
    this.props.archivedAt = undefined;
    this.props.archivedReason = undefined;
    this.touch();
  }

  static create(
    props: Omit<LeadProps, "whatsappVerified" | "permanentlyClosed" | "status" | "isArchived" | "isProspect" | "createdAt" | "updatedAt">
      & Partial<Pick<LeadProps, "whatsappVerified" | "permanentlyClosed" | "status" | "isArchived" | "isProspect" | "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Lead {
    const now = new Date();
    return new Lead(
      {
        whatsappVerified: false,
        permanentlyClosed: false,
        status: "new",
        isArchived: false,
        isProspect: false,
        createdAt: now,
        updatedAt: now,
        ...props,
      },
      id,
    );
  }
}
