import { ICP } from "../../enterprise/entities/icp";

export interface ICPLinkData {
  matchScore?: number;
  notes?: string;
  icpFitStatus?: string;
  realDecisionMaker?: string;
  realDecisionMakerOther?: string;
  perceivedUrgency?: string[];
  businessMoment?: string[];
  currentPlatforms?: string[];
  fragmentationLevel?: number;
  mainDeclaredPain?: string;
  strategicDesire?: string;
  perceivedTechnicalComplexity?: number;
  purchaseTrigger?: string;
  nonClosingReason?: string;
  estimatedDecisionTime?: string;
  expansionPotential?: number;
}

export interface LeadICPRecord extends ICPLinkData {
  id: string;
  leadId: string;
  icpId: string;
  icpName: string;
  icpSlug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationICPRecord extends ICPLinkData {
  id: string;
  organizationId: string;
  icpId: string;
  icpName: string;
  icpSlug: string;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class ICPRepository {
  abstract findById(id: string): Promise<ICP | null>;
  abstract findByOwner(ownerId: string): Promise<ICP[]>;
  abstract existsBySlugAndOwner(slug: string, ownerId: string): Promise<boolean>;
  abstract save(icp: ICP): Promise<void>;
  abstract delete(id: string): Promise<void>;

  abstract getLeadICPs(leadId: string): Promise<LeadICPRecord[]>;
  abstract linkToLead(icpId: string, leadId: string, data?: ICPLinkData): Promise<void>;
  abstract updateLeadLink(icpId: string, leadId: string, data: ICPLinkData): Promise<void>;
  abstract unlinkFromLead(icpId: string, leadId: string): Promise<void>;

  abstract getOrganizationICPs(organizationId: string): Promise<OrganizationICPRecord[]>;
  abstract linkToOrganization(icpId: string, organizationId: string, data?: ICPLinkData): Promise<void>;
  abstract updateOrganizationLink(icpId: string, organizationId: string, data: ICPLinkData): Promise<void>;
  abstract unlinkFromOrganization(icpId: string, organizationId: string): Promise<void>;
}
