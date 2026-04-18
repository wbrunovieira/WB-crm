import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface PartnerProps {
  ownerId: string;

  // Basic company info
  name: string;
  legalName?: string;
  foundationDate?: Date;

  // Partnership type
  partnerType: string;

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
  get lastContactDate()  { return this.props.lastContactDate; }
  get createdAt()        { return this.props.createdAt; }
  get updatedAt()        { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Omit<PartnerProps, "ownerId" | "createdAt" | "updatedAt">>) {
    Object.assign(this.props, data);
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
