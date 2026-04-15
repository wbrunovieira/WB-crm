/**
 * Google Places API (New) Client Tests
 *
 * Tests for src/lib/google/places.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { searchPlaces, PlacesRateLimitError } from "@/lib/google/places";

const API_KEY = "test-api-key";

function makePlaceResult(overrides = {}) {
  return {
    id: "ChIJplace123",
    displayName: { text: "Clínica São Paulo", languageCode: "pt" },
    formattedAddress: "R. das Flores, 100 - São Paulo, SP",
    addressComponents: [
      { longText: "São Paulo", types: ["locality"] },
      { longText: "SP", types: ["administrative_area_level_1"] },
      { longText: "01310-100", types: ["postal_code"] },
      { longText: "Brazil", types: ["country"] },
      { shortText: "BR", types: ["country"] },
    ],
    location: { latitude: -23.5505, longitude: -46.6333 },
    nationalPhoneNumber: "(11) 9999-8888",
    websiteUri: "https://clinica-sp.com.br",
    rating: 4.3,
    userRatingCount: 87,
    priceLevel: "PRICE_LEVEL_MODERATE",
    businessStatus: "OPERATIONAL",
    types: ["health", "doctor", "establishment"],
    primaryType: "doctor",
    editorialSummary: { text: "Clínica médica especializada" },
    googleMapsUri: "https://maps.google.com/?cid=123",
    ...overrides,
  };
}

function mockSuccess(places: unknown[], nextPageToken?: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      places,
      ...(nextPageToken ? { nextPageToken } : {}),
    }),
  });
}

function mockRateLimit() {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 429,
    json: async () => ({
      error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" },
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_PLACES_API_KEY = API_KEY;
});

// ---------------------------------------------------------------------------
describe("searchPlaces — chamada à API", () => {
  it("faz POST para o endpoint correto da Places API (New)", async () => {
    mockSuccess([makePlaceResult()]);

    await searchPlaces({ textQuery: "clínicas em São Paulo" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchText",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("envia a API Key no header X-Goog-Api-Key", async () => {
    mockSuccess([makePlaceResult()]);

    await searchPlaces({ textQuery: "clínicas em São Paulo" });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Goog-Api-Key"]).toBe(API_KEY);
  });

  it("envia Field Mask no header X-Goog-FieldMask", async () => {
    mockSuccess([makePlaceResult()]);

    await searchPlaces({ textQuery: "clínicas em São Paulo" });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Goog-FieldMask"]).toContain("places.id");
    expect(options.headers["X-Goog-FieldMask"]).toContain("nextPageToken");
  });

  it("envia textQuery no body", async () => {
    mockSuccess([makePlaceResult()]);

    await searchPlaces({ textQuery: "restaurantes no Rio" });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.textQuery).toBe("restaurantes no Rio");
  });

  it("envia pageToken quando fornecido", async () => {
    mockSuccess([makePlaceResult()]);

    await searchPlaces({ textQuery: "clínicas", pageToken: "page-token-abc" });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.pageToken).toBe("page-token-abc");
  });

  it("envia languageCode pt-BR por padrão", async () => {
    mockSuccess([makePlaceResult()]);

    await searchPlaces({ textQuery: "clínicas" });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.languageCode).toBe("pt-BR");
  });
});

// ---------------------------------------------------------------------------
describe("searchPlaces — resultado", () => {
  it("retorna lista de places mapeados", async () => {
    mockSuccess([makePlaceResult()]);

    const result = await searchPlaces({ textQuery: "clínicas em São Paulo" });

    expect(result.places).toHaveLength(1);
    expect(result.places[0].placeId).toBe("ChIJplace123");
    expect(result.places[0].businessName).toBe("Clínica São Paulo");
  });

  it("mapeia address para city, state, zipCode, country", async () => {
    mockSuccess([makePlaceResult()]);

    const result = await searchPlaces({ textQuery: "clínicas" });
    const place = result.places[0];

    expect(place.city).toBe("São Paulo");
    expect(place.state).toBe("SP");
    expect(place.zipCode).toBe("01310-100");
    expect(place.country).toBe("Brazil");
  });

  it("mapeia latitude e longitude da location", async () => {
    mockSuccess([makePlaceResult()]);

    const result = await searchPlaces({ textQuery: "clínicas" });

    expect(result.places[0].latitude).toBe(-23.5505);
    expect(result.places[0].longitude).toBe(-46.6333);
  });

  it("mapeia priceLevel string para número (MODERATE = 2)", async () => {
    mockSuccess([makePlaceResult({ priceLevel: "PRICE_LEVEL_MODERATE" })]);

    const result = await searchPlaces({ textQuery: "clínicas" });

    expect(result.places[0].priceLevel).toBe(2);
  });

  it("retorna nextPageToken quando presente", async () => {
    mockSuccess([makePlaceResult()], "next-token-xyz");

    const result = await searchPlaces({ textQuery: "clínicas" });

    expect(result.nextPageToken).toBe("next-token-xyz");
  });

  it("retorna nextPageToken undefined quando não há mais páginas", async () => {
    mockSuccess([makePlaceResult()]);

    const result = await searchPlaces({ textQuery: "clínicas" });

    expect(result.nextPageToken).toBeUndefined();
  });

  it("retorna lista vazia quando Google não encontra resultados", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const result = await searchPlaces({ textQuery: "xyz inexistente" });

    expect(result.places).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe("searchPlaces — rate limit", () => {
  it("lança PlacesRateLimitError quando API retorna 429", async () => {
    mockRateLimit();

    await expect(searchPlaces({ textQuery: "clínicas" })).rejects.toThrow(
      PlacesRateLimitError
    );
  });

  it("PlacesRateLimitError tem retryAfterSeconds = 60", async () => {
    mockRateLimit();

    try {
      await searchPlaces({ textQuery: "clínicas" });
    } catch (err) {
      expect(err).toBeInstanceOf(PlacesRateLimitError);
      expect((err as PlacesRateLimitError).retryAfterSeconds).toBe(60);
    }
  });
});
