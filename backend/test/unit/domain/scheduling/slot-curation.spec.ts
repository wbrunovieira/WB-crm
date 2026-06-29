import { describe, it, expect } from "vitest";
import { curateSlots } from "@/domain/scheduling/enterprise/services/slot-curation.service";

const TZ = "America/Sao_Paulo"; // UTC-3

// slot a partir de "YYYY-MM-DD HH:mm" no horário de Brasília → instantes (Date) UTC
function slot(localDateTime: string) {
  const [d, t] = localDateTime.split(" ");
  const start = new Date(`${d}T${t}:00-03:00`);
  return { start, end: new Date(start.getTime() + 30 * 60000) };
}
const hourBRT = (d: Date) => Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(d));
const dateBRT = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hhmmBRT = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);

// Dia cheio: manhã 09:00–11:30 (6) + tarde 13:00–17:30 (10)
function fullDay(date: string) {
  return [
    ...["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"].map((t) => slot(`${date} ${t}`)),
    ...["13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"].map((t) => slot(`${date} ${t}`)),
  ];
}

describe("curateSlots", () => {
  it("mostra no máximo 3 por turno por dia (3 manhã + 3 tarde)", () => {
    const out = curateSlots(fullDay("2026-06-29"), { maxPerTurno: 3, timeZone: TZ });
    expect(out.filter((s) => hourBRT(s.start) < 12).length).toBe(3);
    expect(out.filter((s) => hourBRT(s.start) >= 12).length).toBe(3);
  });

  it("distribui (início/meio/fim), não pega os 3 primeiros grudados", () => {
    const out = curateSlots(fullDay("2026-06-29"), { maxPerTurno: 3, timeZone: TZ });
    const manha = out.filter((s) => hourBRT(s.start) < 12);
    expect(manha.length).toBe(3);
    expect(manha[2].start.getTime() - manha[0].start.getTime()).toBeGreaterThanOrEqual(90 * 60000); // >= 1h30 de span
  });

  it("rotaciona: dias consecutivos com a mesma disponibilidade mostram horários diferentes", () => {
    const out = curateSlots([...fullDay("2026-06-29"), ...fullDay("2026-06-30")], { maxPerTurno: 3, timeZone: TZ });
    const d1 = out.filter((s) => dateBRT(s.start) === "2026-06-29" && hourBRT(s.start) < 12).map((s) => hhmmBRT(s.start));
    const d2 = out.filter((s) => dateBRT(s.start) === "2026-06-30" && hourBRT(s.start) < 12).map((s) => hhmmBRT(s.start));
    expect(d1).not.toEqual(d2);
  });

  it("sábado só de manhã → 3 manhã, 0 tarde", () => {
    const sat = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"].map((t) => slot(`2026-07-04 ${t}`));
    const out = curateSlots(sat, { maxPerTurno: 3, timeZone: TZ });
    expect(out.filter((s) => hourBRT(s.start) < 12).length).toBe(3);
    expect(out.filter((s) => hourBRT(s.start) >= 12).length).toBe(0);
  });

  it("turno com menos que o limite → mostra todos", () => {
    const out = curateSlots([slot("2026-06-29 09:00"), slot("2026-06-29 10:00")], { maxPerTurno: 3, timeZone: TZ });
    expect(out.length).toBe(2);
  });

  it("mantém ordem cronológica e não duplica", () => {
    const out = curateSlots(fullDay("2026-06-29"), { maxPerTurno: 3, timeZone: TZ });
    const times = out.map((s) => s.start.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });
});
