import { describe, it, expect } from "vitest";
import { CheckLeadGoogleIdExistsUseCase } from "@/domain/leads/application/use-cases/google-places-searches.use-cases";
import {
  GooglePlacesSearchesRepository,
  type GooglePlacesSearchRecord,
} from "@/domain/leads/application/repositories/google-places-searches.repository";

class FakeGooglePlacesSearchesRepository extends GooglePlacesSearchesRepository {
  public leadsByGoogleId = new Map<string, { id: string; businessName: string }>();

  async findFirst(): Promise<GooglePlacesSearchRecord | null> {
    return null;
  }
  async create(): Promise<GooglePlacesSearchRecord> {
    throw new Error("not used in this spec");
  }
  async update(): Promise<void> {}

  async findLeadByGoogleId(googleId: string): Promise<{ id: string; businessName: string } | null> {
    return this.leadsByGoogleId.get(googleId) ?? null;
  }
}

describe("CheckLeadGoogleIdExistsUseCase", () => {
  it("retorna exists:false quando nenhum lead tem esse googleId", async () => {
    const repo = new FakeGooglePlacesSearchesRepository();
    const sut = new CheckLeadGoogleIdExistsUseCase(repo);

    const result = await sut.execute("place-sem-lead");

    expect(result.value).toEqual({ exists: false });
  });

  it("retorna exists:true com leadId e businessName quando já existe um lead com esse googleId", async () => {
    const repo = new FakeGooglePlacesSearchesRepository();
    repo.leadsByGoogleId.set("place-1", { id: "lead-1", businessName: "Padaria do João" });
    const sut = new CheckLeadGoogleIdExistsUseCase(repo);

    const result = await sut.execute("place-1");

    expect(result.value).toEqual({ exists: true, leadId: "lead-1", businessName: "Padaria do João" });
  });
});
