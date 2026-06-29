import { Interval } from "./availability.service";

/**
 * Curadoria de horários para exibição: em vez de mostrar TODA a agenda livre
 * (passa impressão de "sempre disponível"), mostra no máximo `maxPerTurno` por
 * turno (manhã/tarde) por dia, distribuídos início/meio/fim e ROTACIONADOS a
 * cada dia (dias consecutivos exibem horários diferentes). Camada de
 * apresentação — não altera a disponibilidade real. Opera em instantes UTC,
 * com turno/dia calculados no fuso do host.
 */
export function curateSlots(
  slots: Interval[],
  opts: { maxPerTurno: number; timeZone: string; afternoonStartHour?: number },
): Interval[] {
  const { maxPerTurno, timeZone } = opts;
  const afternoonStart = opts.afternoonStartHour ?? 12;
  if (maxPerTurno <= 0) return slots;

  const hourIn = (d: Date) =>
    Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(d));
  const dayIn = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  // agrupa por dia, preservando a ordem de aparição dos dias
  const byDay = new Map<string, Interval[]>();
  for (const s of slots) {
    const k = dayIn(s.start);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  }

  // escolhe `n` itens distribuídos, rotacionando pela posição do dia
  const pick = (arr: Interval[], n: number, dayOffset: number): Interval[] => {
    if (arr.length <= n) return arr;
    const out: Interval[] = [];
    const seg = arr.length / n;
    for (let i = 0; i < n; i++) {
      const start = Math.floor(i * seg);
      const end = Math.floor((i + 1) * seg) - 1; // inclusivo
      const span = Math.max(1, end - start + 1);
      out.push(arr[start + (dayOffset % span)]);
    }
    return out;
  };

  const result: Interval[] = [];
  let dayIndex = 0;
  for (const [, daySlots] of byDay) {
    const ordered = [...daySlots].sort((a, b) => a.start.getTime() - b.start.getTime());
    const manha = ordered.filter((s) => hourIn(s.start) < afternoonStart);
    const tarde = ordered.filter((s) => hourIn(s.start) >= afternoonStart);
    result.push(...pick(manha, maxPerTurno, dayIndex), ...pick(tarde, maxPerTurno, dayIndex));
    dayIndex++;
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}
