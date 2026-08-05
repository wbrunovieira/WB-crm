import { describe, it, expect, beforeEach } from "vitest";
import { GetLeadGooglePhotoUseCase } from "@/domain/leads/application/use-cases/get-lead-google-photo.use-case";
import { GooglePlacesPort, type SearchPlacesInput, type SearchPlacesOutput } from "@/domain/leads/application/ports/google-places.port";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

class FakePlaces extends GooglePlacesPort {
  public photos: Map<string, Buffer | null> = new Map();

  async search(_input: SearchPlacesInput): Promise<SearchPlacesOutput> {
    return { places: [] };
  }

  async getPhoto(placeId: string): Promise<Buffer | null> {
    return this.photos.get(placeId) ?? null;
  }
}

function makeLead(overrides: Partial<Parameters<typeof Lead.create>[0]> = {}) {
  return Lead.create({ ownerId: "owner-1", businessName: "Padaria do João", ...overrides });
}

describe("GetLeadGooglePhotoUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let places: FakePlaces;
  let sut: GetLeadGooglePhotoUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    places = new FakePlaces();
    sut = new GetLeadGooglePhotoUseCase(repo, places);
  });

  it("retorna a foto do Google quando o lead tem googleId com foto", async () => {
    const lead = makeLead({ googleId: "place-1" });
    await repo.save(lead);
    places.photos.set("place-1", Buffer.from("photo-bytes"));

    const result = await sut.execute({ leadId: lead.id.toString(), requesterId: "owner-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.photo.toString()).toBe("photo-bytes");
  });

  it("retorna erro quando o lead não existe", async () => {
    const result = await sut.execute({ leadId: "nao-existe", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro quando o lead não tem googleId", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({ leadId: lead.id.toString(), requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro quando o Google não tem foto pra esse lugar", async () => {
    const lead = makeLead({ googleId: "place-sem-foto" });
    await repo.save(lead);

    const result = await sut.execute({ leadId: lead.id.toString(), requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro quando o requester não é dono nem admin", async () => {
    const lead = makeLead({ googleId: "place-1" });
    await repo.save(lead);
    places.photos.set("place-1", Buffer.from("photo-bytes"));

    const result = await sut.execute({ leadId: lead.id.toString(), requesterId: "outro-user", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });
});
