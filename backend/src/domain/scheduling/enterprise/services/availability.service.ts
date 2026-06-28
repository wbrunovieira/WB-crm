/**
 * Cálculo de disponibilidade para o auto-agendamento ("Calendly interno").
 * Função PURA e determinística (recebe `now` e os intervalos `busy`), com fuso
 * via Intl nativo — sem dependência de lib de data. Tudo em instantes UTC; as
 * janelas de trabalho são interpretadas no fuso do host (ex.: America/Sao_Paulo).
 */

export interface WeeklyWindow {
  weekday: number; // 0=domingo .. 6=sábado
  start: string;   // "HH:mm" no fuso do host
  end: string;     // "HH:mm" no fuso do host
}

export interface Interval {
  start: Date;
  end: Date;
}

export interface AvailabilityInput {
  now: Date;
  timeZone: string;          // fuso do host (Bruno), ex. "America/Sao_Paulo"
  weeklyHours: WeeklyWindow[];
  slotMinutes: number;       // ex. 30
  bufferMinutes: number;     // folga antes/depois de cada compromisso
  minNoticeHours: number;    // antecedência mínima
  maxAdvanceDays: number;    // janela máxima à frente
  busy: Interval[];          // ocupados (do Google freebusy), em UTC
}

const MIN = 60_000;
const DAY = 86_400_000;

/** Offset (ms) do fuso no instante dado: localWallAsUTC - utcInstant. */
function tzOffsetMs(utc: Date, timeZone: string): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(utc);
  const g = (t: string) => Number(f.find((p) => p.type === t)!.value);
  const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return asUTC - utc.getTime();
}

/** Converte um "wall clock" (Y-M-D H:m no fuso) para o instante UTC correspondente. */
function wallToUtc(y: number, m: number, d: number, h: number, min: number, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  // duas passadas cobrem viradas de offset (DST)
  let off = tzOffsetMs(new Date(guess), timeZone);
  off = tzOffsetMs(new Date(guess - off), timeZone);
  return new Date(guess - off);
}

/** Y/M/D/weekday do instante no fuso do host. */
function ymdInTz(utc: Date, timeZone: string): { y: number; m: number; d: number; weekday: number } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(utc);
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: Number(g("year")), m: Number(g("month")), d: Number(g("day")), weekday: WD[g("weekday")] };
}

const hm = (s: string) => { const [h, m] = s.split(":").map(Number); return { h, m }; };

export function computeAvailableSlots(input: AvailabilityInput): Interval[] {
  const { now, timeZone, weeklyHours, slotMinutes, bufferMinutes, minNoticeHours, maxAdvanceDays, busy } = input;

  const earliest = now.getTime() + minNoticeHours * 3600_000;
  const latest = now.getTime() + maxAdvanceDays * DAY;
  const bufMs = bufferMinutes * MIN;
  const slotMs = slotMinutes * MIN;

  const byWeekday = new Map<number, WeeklyWindow[]>();
  for (const w of weeklyHours) {
    if (!byWeekday.has(w.weekday)) byWeekday.set(w.weekday, []);
    byWeekday.get(w.weekday)!.push(w);
  }

  const out: Interval[] = [];

  // Itera dia a dia (no fuso do host) de `earliest` até `latest`.
  for (let t = earliest; t <= latest; t += DAY) {
    const { y, m, d, weekday } = ymdInTz(new Date(t), timeZone);
    const windows = byWeekday.get(weekday);
    if (!windows) continue;

    for (const w of windows) {
      const s = hm(w.start), e = hm(w.end);
      const windowStart = wallToUtc(y, m, d, s.h, s.m, timeZone).getTime();
      const windowEnd = wallToUtc(y, m, d, e.h, e.m, timeZone).getTime();

      for (let slotStart = windowStart; slotStart + slotMs <= windowEnd; slotStart += slotMs) {
        const slotEnd = slotStart + slotMs;
        if (slotStart < earliest || slotEnd > latest) continue;

        const collides = busy.some(
          (b) => slotStart < b.end.getTime() + bufMs && slotEnd > b.start.getTime() - bufMs,
        );
        if (collides) continue;

        out.push({ start: new Date(slotStart), end: new Date(slotEnd) });
      }
    }
  }

  // dedup + ordena (dias iterados podem repetir bordas de janela)
  const seen = new Set<number>();
  return out
    .filter((s) => { const k = s.start.getTime(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
