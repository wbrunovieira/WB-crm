/**
 * Manager Dashboard period helpers
 *
 * Tests for src/lib/manager-periods.ts — the single source of truth for the
 * day/week/month ranges the Manager Dashboard sends to the backend AND for the
 * labels its navigator shows. Both used to compute the same Monday arithmetic
 * independently, so a change to one silently disagreed with the other.
 *
 * All ranges are UTC calendar days: the backend normalizes "YYYY-MM-DD" bounds
 * in UTC, and the labels are built with Date.UTC.
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getWeekRange,
  getDayRange,
  getMonthRange,
} from "@/lib/manager-periods";

// Wednesday, 26 Aug 2026 (UTC) — mid-week, so the Monday/Sunday edges are non-trivial.
const WEDNESDAY = new Date("2026-08-26T15:00:00.000Z");

const freeze = (date: Date) => {
  vi.useFakeTimers();
  vi.setSystemTime(date);
};

afterEach(() => {
  vi.useRealTimers();
});

describe("getWeekRange", () => {
  it("vai de segunda a DOMINGO (a semana inteira, não só os dias úteis)", () => {
    freeze(WEDNESDAY);

    // A deal closed on Saturday or Sunday must land inside some week — with a
    // Monday–Friday range it belonged to no week at all.
    expect(getWeekRange(0)).toEqual({ start: "2026-08-24", end: "2026-08-30" });
  });

  it("navega para semanas anteriores em blocos de 7 dias", () => {
    freeze(WEDNESDAY);

    expect(getWeekRange(-1)).toEqual({ start: "2026-08-17", end: "2026-08-23" });
    expect(getWeekRange(-2)).toEqual({ start: "2026-08-10", end: "2026-08-16" });
  });

  it("no domingo, ainda pertence à semana que começou na segunda anterior", () => {
    // Sunday 30 Aug 2026: getUTCDay() === 0, the edge case the -6 branch exists for.
    freeze(new Date("2026-08-30T10:00:00.000Z"));

    expect(getWeekRange(0)).toEqual({ start: "2026-08-24", end: "2026-08-30" });
  });

  it("atravessa a virada de mês", () => {
    freeze(new Date("2026-09-02T10:00:00.000Z")); // quarta

    expect(getWeekRange(0)).toEqual({ start: "2026-08-31", end: "2026-09-06" });
  });
});

describe("getDayRange", () => {
  it("um único dia, com início igual ao fim", () => {
    freeze(WEDNESDAY);

    expect(getDayRange(0)).toEqual({ start: "2026-08-26", end: "2026-08-26" });
    expect(getDayRange(-1)).toEqual({ start: "2026-08-25", end: "2026-08-25" });
  });
});

describe("getMonthRange", () => {
  it("primeiro ao último dia do mês de calendário", () => {
    freeze(WEDNESDAY);

    expect(getMonthRange(0)).toEqual({ start: "2026-08-01", end: "2026-08-31" });
    expect(getMonthRange(-1)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });

  it("volta para o ano anterior", () => {
    freeze(new Date("2026-01-15T10:00:00.000Z"));

    expect(getMonthRange(-1)).toEqual({ start: "2025-12-01", end: "2025-12-31" });
  });
});
