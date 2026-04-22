import type { Activity } from "./activity";

export interface DealListItem {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  expectedCloseDate: string | null;
  contact: { id: string; name: string } | null;
  organization: { id: string; name: string } | null;
  stage: { id: string; name: string; pipeline: { id: string; name: string } };
  createdAt: string;
  owner?: { id: string; name: string; email?: string | null };
}

export interface DealContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
}

export interface DealOrganization {
  id: string;
  name: string;
}

export interface DealOwner {
  id: string;
  name: string;
  email?: string | null;
}

export interface DealStageChange {
  id: string;
  fromStage: { id: string; name: string } | null;
  toStage: { id: string; name: string };
  changedBy: { id: string; name: string | null; email: string };
  changedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  status: string;
  stageId: string;
  contactId: string | null;
  organizationId: string | null;
  leadId?: string | null;
  expectedCloseDate: string | null;
  createdAt: string;
  owner: DealOwner;
  contact?: DealContact | null;
  organization?: DealOrganization | null;
  activities: Activity[];
  stageHistory?: DealStageChange[];
}
