import { describe, it, expect } from "vitest";
import { computeAvailableSlots } from "@/domain/scheduling/enterprise/services/availability.service";

const TZ = "America/Sao_Paulo"; // UTC-3, sem DST desde 2019

// Helpers de asserção: lê o "wall clock" do slot no fuso do host
function parts(d: Date) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)!.value;
  return {
    weekday: get("weekday"),
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hhmm: `${get("hour")}:${get("minute")}`,
  };
}
// casa por DATA específica (evita pegar o mesmo dia-da-semana de outra semana)
const hasAt = (slots: { start: Date }[], date: string, hhmm: string) =>
  slots.some((s) => { const p = parts(s.start); return p.date === date && p.hhmm === hhmm; });

const WEEKLY = [
  { weekday: 1, start: "09:00", end: "18:00" },
  { weekday: 2, start: "09:00", end: "18:00" },
  { weekday: 3, start: "09:00", end: "18:00" },
  { weekday: 4, start: "09:00", end: "18:00" },
  { weekday: 5, start: "09:00", end: "18:00" },
  { weekday: 6, start: "08:00", end: "12:00" }, // sábado
];

// Quarta-feira 2026-07-01 12:00 BRT  (= 15:00Z)
const NOW = new Date("2026-07-01T15:00:00Z");

function run(over: Partial<Parameters<typeof computeAvailableSlots>[0]> = {}) {
  return computeAvailableSlots({
    now: NOW, timeZone: TZ, weeklyHours: WEEKLY,
    slotMinutes: 30, bufferMinutes: 15, minNoticeHours: 4, maxAdvanceDays: 14,
    busy: [],
    ...over,
  });
}

describe("computeAvailableSlots", () => {
  it("todos os slots têm 30min e caem dentro de uma janela de trabalho", () => {
    const slots = run();
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(s.end.getTime() - s.start.getTime()).toBe(30 * 60_000);
      const p = parts(s.start);
      expect(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(p.weekday); // nunca domingo
    }
  });

  it("respeita antecedência mínima (4h) e janela máxima (14 dias)", () => {
    const slots = run();
    const earliest = NOW.getTime() + 4 * 3600_000;
    const latest = NOW.getTime() + 14 * 86400_000;
    for (const s of slots) {
      expect(s.start.getTime()).toBeGreaterThanOrEqual(earliest);
      expect(s.end.getTime()).toBeLessThanOrEqual(latest);
    }
    // hoje (quarta 01/07) antes de now+4h não aparece; depois aparece
    expect(hasAt(slots, "2026-07-01", "09:00")).toBe(false); // antes do min-notice
    expect(hasAt(slots, "2026-07-01", "16:00")).toBe(true);  // 16:00 BRT = now+4h
  });

  it("sábado usa a janela 08:00–12:00 (e não passa de 12:00)", () => {
    const slots = run();
    // sábado 04/07
    expect(hasAt(slots, "2026-07-04", "08:00")).toBe(true);
    expect(hasAt(slots, "2026-07-04", "11:30")).toBe(true);
    expect(hasAt(slots, "2026-07-04", "12:00")).toBe(false); // 12:00–12:30 ultrapassa o fim
  });

  it("remove slots que colidem com 'busy' + buffer", () => {
    // ocupado quinta 02/07 10:00–11:00 BRT = 13:00–14:00Z
    const busy = [{ start: new Date("2026-07-02T13:00:00Z"), end: new Date("2026-07-02T14:00:00Z") }];
    const slots = run({ busy });
    expect(hasAt(slots, "2026-07-02", "09:00")).toBe(true);  // livre, antes do buffer
    expect(hasAt(slots, "2026-07-02", "09:30")).toBe(false); // 09:30–10:00 colide com buffer (09:45)
    expect(hasAt(slots, "2026-07-02", "10:00")).toBe(false); // dentro do ocupado
    expect(hasAt(slots, "2026-07-02", "11:00")).toBe(false); // 11:00 colide com buffer (até 11:15)
    expect(hasAt(slots, "2026-07-02", "11:30")).toBe(true);  // livre de novo
  });
});
