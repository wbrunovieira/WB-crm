/**
 * Google Leads Import Action Tests
 *
 * Tests for src/actions/google-leads.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";

vi.mock("@/lib/google/places", () => ({
  searchPlaces: vi.fn(),
  PlacesRateLimitError: class PlacesRateLimitError extends Error {
    retryAfterSeconds = 60;
    constructor() { super("Rate limited"); }
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { importGoogleLeads } from "@/actions/google-leads";
import { searchPlaces, PlacesRateLimitError } from "@/lib/google/places";
import { getServerSession } from "next-auth";

const mockSearchPlaces = vi.mocked(searchPlaces);
const mockGetSession = vi.mocked(getServerSession);

const SESSION = { user: { id: "user-123", name: "Bruno", email: "b@wb.com", role: "sdr" } };

const PARAMS = {
  country: "BR",
  city: "São Paulo",
  typeKeyword: "clínica médica",
  requestedCount: 3,
};

function makePlaceResult(placeId: string, name: string) {
  return {
    placeId,
    businessName: name,
    address: `R. ${name}, 1`,
    city: "São Paulo",
    state: "SP",
    country: "Brazil",
    zipCode: "01310-000",
    phone: "(11) 9999-0000",
    website: `https://${placeId}.com`,
    rating: 4.2,
    userRatingCount: 50,
    priceLevel: 2,
    businessStatus: "OPERATIONAL",
    types: ["health"],
    latitude: -23.5,
    longitude: -46.6,
    googleMapsUrl: `https://maps.google.com/?cid=${placeId}`,
  };
}

const mockSearchProfile = {
  id: "search-profile-1",
  ownerId: "user-123",
  country: "BR",
  city: "São Paulo",
  zipCode: null,
  typeKeyword: "clínica médica",
  searchQuery: "clínica médica em São Paulo, Brazil",
  fetchedPlaceIds: "[]",
  totalFetched: 0,
  totalImported: 0,
  status: "active",
  lastFetchedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION as never);

  // Default: search profile not found yet (will be created)
  prismaMock.googlePlacesSearch.findUnique.mockResolvedValue(null as never);
  prismaMock.googlePlacesSearch.upsert.mockResolvedValue(mockSearchProfile as never);
  prismaMock.googlePlacesSearch.update.mockResolvedValue(mockSearchProfile as never);

  // Default: no existing leads with these googleIds
  prismaMock.lead.findFirst.mockResolvedValue(null as never);
  prismaMock.lead.create.mockResolvedValue({ id: "new-lead-1" } as never);
});

// ---------------------------------------------------------------------------
describe("importGoogleLeads — autenticação", () => {
  it("retorna erro se não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await importGoogleLeads(PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/não autorizado/i);
  });
});

// ---------------------------------------------------------------------------
describe("importGoogleLeads — busca e importação básica", () => {
  it("chama searchPlaces com query correta", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [makePlaceResult("place-1", "Clínica A")],
      nextPageToken: undefined,
    });

    await importGoogleLeads(PARAMS);

    expect(mockSearchPlaces).toHaveBeenCalledWith(
      expect.objectContaining({
        textQuery: expect.stringContaining("clínica médica"),
      })
    );
  });

  it("cria Lead para cada place novo", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [
        makePlaceResult("place-1", "Clínica A"),
        makePlaceResult("place-2", "Clínica B"),
        makePlaceResult("place-3", "Clínica C"),
      ],
      nextPageToken: undefined,
    });

    await importGoogleLeads({ ...PARAMS, requestedCount: 3 });

    expect(prismaMock.lead.create).toHaveBeenCalledTimes(3);
  });

  it("salva source como 'google_places' no Lead", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [makePlaceResult("place-1", "Clínica A")],
      nextPageToken: undefined,
    });

    await importGoogleLeads({ ...PARAMS, requestedCount: 1 });

    const call = prismaMock.lead.create.mock.calls[0][0];
    expect(call.data.source).toBe("google_places");
  });

  it("salva googleId no Lead", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [makePlaceResult("ChIJplace123", "Clínica A")],
      nextPageToken: undefined,
    });

    await importGoogleLeads({ ...PARAMS, requestedCount: 1 });

    const call = prismaMock.lead.create.mock.calls[0][0];
    expect(call.data.googleId).toBe("ChIJplace123");
  });

  it("retorna contagem correta de importados", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [
        makePlaceResult("place-1", "A"),
        makePlaceResult("place-2", "B"),
      ],
      nextPageToken: undefined,
    });

    const result = await importGoogleLeads({ ...PARAMS, requestedCount: 2 });

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
  });
});

// ---------------------------------------------------------------------------
describe("importGoogleLeads — deduplicação", () => {
  it("pula place que já está no fetchedPlaceIds do search profile", async () => {
    prismaMock.googlePlacesSearch.findUnique.mockResolvedValue({
      ...mockSearchProfile,
      fetchedPlaceIds: JSON.stringify(["place-already-seen"]),
    } as never);

    mockSearchPlaces.mockResolvedValue({
      places: [
        makePlaceResult("place-already-seen", "Clínica Já Vista"),
        makePlaceResult("place-new", "Clínica Nova"),
      ],
      nextPageToken: undefined,
    });

    const result = await importGoogleLeads({ ...PARAMS, requestedCount: 2 });

    expect(prismaMock.lead.create).toHaveBeenCalledTimes(1);
    expect(result.skipped).toBe(1);
  });

  it("pula place cujo googleId já existe como Lead (mesmo arquivado)", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [makePlaceResult("place-exists", "Clínica Existente")],
      nextPageToken: undefined,
    });

    // Simula lead existente (arquivado)
    prismaMock.lead.findFirst.mockResolvedValue({
      id: "existing-lead",
      googleId: "place-exists",
      isArchived: true,
    } as never);

    const result = await importGoogleLeads({ ...PARAMS, requestedCount: 1 });

    expect(prismaMock.lead.create).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it("busca Lead por googleId sem filtro de ownerId (global)", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [makePlaceResult("place-1", "Clínica A")],
      nextPageToken: undefined,
    });

    await importGoogleLeads({ ...PARAMS, requestedCount: 1 });

    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { googleId: "place-1" },
        // NÃO deve ter ownerId no where
      })
    );

    const call = prismaMock.lead.findFirst.mock.calls[0][0];
    expect(call.where.ownerId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe("importGoogleLeads — auto-avanço de páginas", () => {
  it("busca página 2 quando página 1 está toda duplicada", async () => {
    prismaMock.googlePlacesSearch.findUnique.mockResolvedValue({
      ...mockSearchProfile,
      fetchedPlaceIds: JSON.stringify(["place-1", "place-2"]),
    } as never);

    mockSearchPlaces
      .mockResolvedValueOnce({
        places: [
          makePlaceResult("place-1", "A"),
          makePlaceResult("place-2", "B"),
        ],
        nextPageToken: "page-2-token",
      })
      .mockResolvedValueOnce({
        places: [makePlaceResult("place-3", "C")],
        nextPageToken: undefined,
      });

    await importGoogleLeads({ ...PARAMS, requestedCount: 1 });

    expect(mockSearchPlaces).toHaveBeenCalledTimes(2);
    expect(mockSearchPlaces).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageToken: "page-2-token" })
    );
  });

  it("para de buscar quando Google não tem mais resultados", async () => {
    prismaMock.googlePlacesSearch.findUnique.mockResolvedValue({
      ...mockSearchProfile,
      fetchedPlaceIds: JSON.stringify(["place-1", "place-2"]),
    } as never);

    mockSearchPlaces.mockResolvedValue({
      places: [
        makePlaceResult("place-1", "A"),
        makePlaceResult("place-2", "B"),
      ],
      nextPageToken: undefined, // sem mais páginas
    });

    const result = await importGoogleLeads({ ...PARAMS, requestedCount: 5 });

    expect(mockSearchPlaces).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("exhausted");
  });

  it("para quando atinge o requestedCount exato", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [
        makePlaceResult("place-1", "A"),
        makePlaceResult("place-2", "B"),
        makePlaceResult("place-3", "C"),
        makePlaceResult("place-4", "D"),
      ],
      nextPageToken: "more-token",
    });

    await importGoogleLeads({ ...PARAMS, requestedCount: 2 });

    // Não deve buscar página 2 pois já tem 2 importados
    expect(mockSearchPlaces).toHaveBeenCalledTimes(1);
    expect(prismaMock.lead.create).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
describe("importGoogleLeads — search profile", () => {
  it("faz upsert do GooglePlacesSearch com a combinação de busca", async () => {
    mockSearchPlaces.mockResolvedValue({
      places: [makePlaceResult("p1", "A")],
      nextPageToken: undefined,
    });

    await importGoogleLeads(PARAMS);

    expect(prismaMock.googlePlacesSearch.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId_country_city_zipCode_typeKeyword: expect.objectContaining({
            ownerId: "user-123",
            country: "BR",
            city: "São Paulo",
            typeKeyword: "clínica médica",
          }),
        }),
      })
    );
  });

  it("atualiza fetchedPlaceIds com todos os place_ids vistos (incluindo duplicados)", async () => {
    prismaMock.googlePlacesSearch.findUnique.mockResolvedValue({
      ...mockSearchProfile,
      fetchedPlaceIds: JSON.stringify(["old-place"]),
    } as never);

    mockSearchPlaces.mockResolvedValue({
      places: [
        makePlaceResult("old-place", "Já existe"),
        makePlaceResult("new-place", "Nova"),
      ],
      nextPageToken: undefined,
    });

    await importGoogleLeads({ ...PARAMS, requestedCount: 5 });

    const updateCall = prismaMock.googlePlacesSearch.update.mock.calls[0][0];
    const updatedIds = JSON.parse(updateCall.data.fetchedPlaceIds);
    expect(updatedIds).toContain("old-place");
    expect(updatedIds).toContain("new-place");
  });

  it("incrementa totalFetched e totalImported após busca", async () => {
    prismaMock.googlePlacesSearch.findUnique.mockResolvedValue({
      ...mockSearchProfile,
      totalFetched: 10,
      totalImported: 8,
    } as never);

    mockSearchPlaces.mockResolvedValue({
      places: [
        makePlaceResult("p1", "A"),
        makePlaceResult("p2", "B"),
      ],
      nextPageToken: undefined,
    });

    await importGoogleLeads({ ...PARAMS, requestedCount: 2 });

    const updateCall = prismaMock.googlePlacesSearch.update.mock.calls[0][0];
    expect(updateCall.data.totalFetched).toBe(12); // 10 + 2 novos vistos
    expect(updateCall.data.totalImported).toBe(10); // 8 + 2 importados
  });
});

// ---------------------------------------------------------------------------
describe("importGoogleLeads — rate limit", () => {
  it("retorna status rate_limited e retryAfterSeconds quando API esgota", async () => {
    const { PlacesRateLimitError: RLE } = await import("@/lib/google/places");
    mockSearchPlaces.mockRejectedValue(new RLE());

    const result = await importGoogleLeads(PARAMS);

    expect(result.success).toBe(false);
    expect(result.status).toBe("rate_limited");
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("retorna quantos foram importados antes do rate limit", async () => {
    const { PlacesRateLimitError: RLE } = await import("@/lib/google/places");

    mockSearchPlaces
      .mockResolvedValueOnce({
        places: [makePlaceResult("p1", "A")],
        nextPageToken: "token",
      })
      .mockRejectedValueOnce(new RLE());

    const result = await importGoogleLeads({ ...PARAMS, requestedCount: 5 });

    expect(result.imported).toBe(1);
    expect(result.status).toBe("rate_limited");
  });
});
