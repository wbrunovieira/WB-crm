import { describe, it, expect } from "vitest";
import { parseInstant } from "@/core/date/parse-instant";

describe("parseInstant", () => {
  it("interprets a naive date-time as America/Sao_Paulo (UTC-3)", () => {
    // 16:00 São Paulo = 19:00 UTC
    expect(parseInstant("2026-06-30T16:00:00")?.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("interprets a naive date-time without seconds as São Paulo", () => {
    expect(parseInstant("2026-06-30T16:00")?.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("accepts a space separator (SQL-ish) as naive São Paulo", () => {
    expect(parseInstant("2026-06-30 09:30:00")?.toISOString()).toBe("2026-06-30T12:30:00.000Z");
  });

  it("parses an explicit-Z instant as absolute (UI path — unchanged)", () => {
    expect(parseInstant("2026-06-30T19:00:00.000Z")?.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("parses an explicit offset as absolute", () => {
    // 16:00-03:00 == 19:00Z
    expect(parseInstant("2026-06-30T16:00:00-03:00")?.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("returns undefined for null/undefined/empty", () => {
    expect(parseInstant(null)).toBeUndefined();
    expect(parseInstant(undefined)).toBeUndefined();
    expect(parseInstant("")).toBeUndefined();
  });

  it("passes a Date through unchanged", () => {
    const d = new Date("2026-06-30T19:00:00.000Z");
    expect(parseInstant(d)).toBe(d);
  });

  it("returns an invalid Date for garbage (callers validate)", () => {
    expect(isNaN(parseInstant("not-a-date")!.getTime())).toBe(true);
  });

  it("handles midnight wall time across the day boundary correctly", () => {
    // 2026-06-30 23:30 SP = 2026-07-01 02:30 UTC
    expect(parseInstant("2026-06-30T23:30:00")?.toISOString()).toBe("2026-07-01T02:30:00.000Z");
  });
});
