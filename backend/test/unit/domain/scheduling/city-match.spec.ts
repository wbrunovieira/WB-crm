import { describe, it, expect } from "vitest";
import { normalizeCity, cityIsServed } from "@/domain/scheduling/enterprise/services/city-match";

describe("normalizeCity / cityIsServed", () => {
  it("ignora acento, caixa e espaços", () => {
    const ref = normalizeCity("Petrópolis");
    expect(normalizeCity("petropolis")).toBe(ref);
    expect(normalizeCity("PETRÓPOLIS")).toBe(ref);
    expect(normalizeCity("  petrópolis ")).toBe(ref);
    expect(normalizeCity("Petropolis")).toBe(ref);
  });

  it("São Paulo vs sao paulo", () => {
    expect(normalizeCity("São Paulo")).toBe(normalizeCity("sao paulo"));
  });

  it("cidades diferentes não casam", () => {
    expect(normalizeCity("Petrópolis")).not.toBe(normalizeCity("Teresópolis"));
  });

  it("cityIsServed casa com variações", () => {
    const served = [{ city: "Petrópolis" }, { city: "Teresópolis" }];
    expect(cityIsServed("petropolis", served)).toBe(true);
    expect(cityIsServed("TERESOPOLIS", served)).toBe(true);
    expect(cityIsServed("  Petrópolis  ", served)).toBe(true);
    expect(cityIsServed("São Paulo", served)).toBe(false);
    expect(cityIsServed(null, served)).toBe(false);
    expect(cityIsServed("", served)).toBe(false);
  });
});
