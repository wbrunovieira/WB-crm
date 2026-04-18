import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

/**
 * Discriminator for the 10 admin tech-option entity types:
 * - Tech Stack: tech-category, tech-language, tech-framework
 * - Tech Profile: profile-language, profile-framework, profile-hosting,
 *                 profile-database, profile-erp, profile-crm, profile-ecommerce
 */
export type TechOptionType =
  | "tech-category"
  | "tech-language"
  | "tech-framework"
  | "profile-language"
  | "profile-framework"
  | "profile-hosting"
  | "profile-database"
  | "profile-erp"
  | "profile-crm"
  | "profile-ecommerce";

export const TECH_OPTION_TYPES: TechOptionType[] = [
  "tech-category", "tech-language", "tech-framework",
  "profile-language", "profile-framework", "profile-hosting",
  "profile-database", "profile-erp", "profile-crm", "profile-ecommerce",
];

export interface AdminTechOptionProps {
  entityType: TechOptionType;
  name: string;
  slug: string;
  description?: string;    // tech-category only
  color?: string;
  icon?: string;
  order?: number;
  isActive: boolean;
  languageSlug?: string;   // tech-framework only
  subType?: string;        // profile-hosting, profile-database: categorize provider type
  createdAt: Date;
  updatedAt: Date;
}

export class AdminTechOption extends AggregateRoot<AdminTechOptionProps> {
  get entityType()   { return this.props.entityType; }
  get name()         { return this.props.name; }
  get slug()         { return this.props.slug; }
  get description()  { return this.props.description; }
  get color()        { return this.props.color; }
  get icon()         { return this.props.icon; }
  get order()        { return this.props.order; }
  get isActive()     { return this.props.isActive; }
  get languageSlug() { return this.props.languageSlug; }
  get subType()      { return this.props.subType; }
  get createdAt()    { return this.props.createdAt; }
  get updatedAt()    { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Pick<AdminTechOptionProps, "name" | "slug" | "description" | "color" | "icon" | "order" | "languageSlug" | "subType">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  toggleActive() {
    this.props.isActive = !this.props.isActive;
    this.touch();
  }

  static create(
    props: Omit<AdminTechOptionProps, "createdAt" | "updatedAt"> & Partial<Pick<AdminTechOptionProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): AdminTechOption {
    const now = new Date();
    return new AdminTechOption({ createdAt: now, updatedAt: now, ...props }, id);
  }
}
