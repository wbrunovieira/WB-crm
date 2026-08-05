import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";
import { GooglePlacesPort } from "../ports/google-places.port";

export interface GetLeadGooglePhotoInput {
  leadId: string;
  requesterId: string;
  requesterRole: string;
}

export interface GetLeadGooglePhotoOutput {
  photo: Buffer;
}

/**
 * Fallback photo for a lead with no "foto da fachada" attached: the lead's Google Business
 * Profile photo, fetched on demand (Place Details → Photo Media) via `googleId` — no DB field,
 * no migration. See GooglePlacesClient for the caching layer.
 */
@Injectable()
export class GetLeadGooglePhotoUseCase {
  constructor(
    private readonly leads: LeadsRepository,
    private readonly places: GooglePlacesPort,
  ) {}

  async execute(input: GetLeadGooglePhotoInput): Promise<Either<Error, GetLeadGooglePhotoOutput>> {
    const lead = await this.leads.findByIdRaw(input.leadId);
    if (!lead) return left(new Error("Foto não encontrada"));

    const isOwner = lead.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Foto não encontrada"));

    if (!lead.googleId) return left(new Error("Foto não encontrada"));

    const photo = await this.places.getPhoto(lead.googleId);
    if (!photo) return left(new Error("Foto não encontrada"));

    return right({ photo });
  }
}
