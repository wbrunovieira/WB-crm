import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

/**
 * Partner lifecycle stages (orthogonal to partnerType).
 * Keep in sync with the frontend list in src/lib/validations/partner.ts (PARTNER_STATUSES).
 */
export const PARTNER_STATUSES = ["prospect", "active", "inactive"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export function isPartnerStatus(value: string): value is PartnerStatus {
  return (PARTNER_STATUSES as readonly string[]).includes(value);
}

export interface PartnerProps {
  ownerId: string;

  // Basic company info
  name: string;
  legalName?: string;
  foundationDate?: Date;

  // Partnership type
  partnerType: string;

  // Lifecycle: prospect (partner lead) | active (officialized) | inactive (ended)
  partnerStatus: string;
  partnershipStartedAt?: Date;

  // Contact info
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;

  // Location
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  streetAddress?: string;

  // Social media
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;

  // Partnership info
  industry?: string;
  employeeCount?: number;
  companySize?: string;
  description?: string;
  expertise?: string;
  notes?: string;

  // Manual star rating (1–5) to prioritize partners; null = unrated
  starRating?: number | null;

  lastContactDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export class Partner extends AggregateRoot<PartnerProps> {
  get ownerId()          { return this.props.ownerId; }
  get name()             { return this.props.name; }
  get legalName()        { return this.props.legalName; }
  get foundationDate()   { return this.props.foundationDate; }
  get partnerType()      { return this.props.partnerType; }
  get partnerStatus()        { return this.props.partnerStatus; }
  get partnershipStartedAt() { return this.props.partnershipStartedAt; }
  get website()          { return this.props.website; }
  get email()            { return this.props.email; }
  get phone()            { return this.props.phone; }
  get whatsapp()         { return this.props.whatsapp; }
  get country()          { return this.props.country; }
  get state()            { return this.props.state; }
  get city()             { return this.props.city; }
  get zipCode()          { return this.props.zipCode; }
  get streetAddress()    { return this.props.streetAddress; }
  get linkedin()         { return this.props.linkedin; }
  get instagram()        { return this.props.instagram; }
  get facebook()         { return this.props.facebook; }
  get twitter()          { return this.props.twitter; }
  get industry()         { return this.props.industry; }
  get employeeCount()    { return this.props.employeeCount; }
  get companySize()      { return this.props.companySize; }
  get description()      { return this.props.description; }
  get expertise()        { return this.props.expertise; }
  get notes()            { return this.props.notes; }
  get starRating()       { return this.props.starRating ?? null; }
  get lastContactDate()  { return this.props.lastContactDate; }
  get createdAt()        { return this.props.createdAt; }
  get updatedAt()        { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Omit<PartnerProps, "ownerId" | "createdAt" | "updatedAt">>) {
    // PATCH semantics: only touch fields explicitly provided. A key set to
    // undefined (e.g. an omitted optional field forwarded by the controller)
    // must NOT wipe an existing value like partnershipStartedAt or foundationDate.
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) (this.props as unknown as Record<string, unknown>)[key] = value;
    }
    this.touch();
  }

  touchLastContact() {
    this.props.lastContactDate = new Date();
    this.touch();
  }

  static create(
    props: Omit<PartnerProps, "createdAt" | "updatedAt"> & Partial<Pick<PartnerProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Partner {
    const now = new Date();
    return new Partner(
      {
        createdAt: now,
        updatedAt: now,
        ...props,
      },
      id,
    );
  }
}
