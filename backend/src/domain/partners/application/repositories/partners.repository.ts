import type { Partner } from "../../enterprise/entities/partner";
import type { PartnerSummary, PartnerDetail } from "../../enterprise/read-models/partner-read-models";

export interface PartnerFilters {
  search?: string;
  owner?: string;
  status?: string;
}

export interface PartnerEmailVerificationData {
  emailVerified: boolean;
  emailVerifiedAt: Date;
  emailVerificationStatus: string;
  emailVerificationReason: string;
}

export interface PartnerPhoneVerificationData {
  phoneValid?: boolean;
  phoneType?: string;
  whatsappPhoneValid?: boolean;
  whatsappPhoneType?: string;
}

export abstract class PartnersRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: PartnerFilters): Promise<PartnerSummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<PartnerDetail | null>;
  abstract findByIdRaw(id: string): Promise<Partner | null>;
  abstract save(partner: Partner): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract saveEmailVerification(partnerId: string, data: PartnerEmailVerificationData): Promise<void>;
  abstract savePhoneVerification(partnerId: string, data: PartnerPhoneVerificationData): Promise<void>;
}
