"use client";

import { useMemo, useState } from "react";

interface Slot { start: string; end: string }
interface ManageData {
  status: string;
  currentStartAt: string;
  bookingType: { name: string; timeZone: string; durationMinutes: number } | null;
  slots: Slot[];
}

const PURPLE = "#792990";
const ORANGE = "#e8531e";

export function ManageClient({ manageToken, backend, initial }: { manageToken: string; backend: string; initial: ManageData | null }) {
  const tz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Sao_Paulo"; } }, []);
  const [view, setView] = useState<"home" | "reschedule">("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "rescheduled" | "cancelled" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [newStart, setNewStart] = useState<string | null>(null);

  const fmtTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const fmtDay = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long" }).format(new Date(iso));
  const fmtFull = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of initial?.slots ?? []) { const k = fmtDay(s.start); if (!map.has(k)) map.set(k, []); map.get(k)!.push(s); }
    return Array.from(map.entries());
  }, [initial, tz]);

  async function call(path: string, body?: object) {
    setStatus("submitting"); setErrorMsg("");
    try {
      const r = await fetch(`${backend}/public/booking/manage/${encodeURIComponent(manageToken)}/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || "Não foi possível concluir."); }
      return true;
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : "Erro"); setStatus("error"); return false; }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: "100vh", background: "#350045" }} className="flex items-start justify-center px-4 py-10 text-white">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center text-sm tracking-widest text-white/60">WB DIGITAL SOLUTIONS</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">{children}</div>
      </div>
    </div>
  );

  if (!initial) return <Shell><h1 className="text-xl font-semibold">Link indisponível</h1><p className="mt-2 text-white/70">Este link é inválido ou expirou.</p></Shell>;

  if (status === "cancelled" || initial.status === "cancelled") {
    return <Shell><div className="text-center"><div className="mb-3 text-3xl">🗑️</div><h1 className="text-xl font-bold">Agendamento cancelado</h1><p className="mt-2 text-white/70">Se foi sem querer, fale com a gente para reagendar.</p></div></Shell>;
  }

  if (status === "rescheduled" && newStart) {
    return <Shell><div className="text-center"><div className="mb-3 text-3xl">✓</div><h1 className="text-xl font-bold">Reunião remarcada!</h1><p className="mt-2 text-white/80">{fmtFull(newStart)} <span className="text-white/50">({tz})</span></p><p className="mt-4 text-sm text-white/60">Atualizamos o convite no seu e-mail.</p></div></Shell>;
  }

  if (view === "reschedule") {
    return (
      <Shell>
        <h1 className="text-xl font-bold">Escolha um novo horário</h1>
        <p className="mt-1 text-xs text-white/50">Horários no seu fuso ({tz}).</p>
        <div className="mt-5 max-h-[50vh] space-y-5 overflow-y-auto pr-1">
          {days.length === 0 && <p className="text-white/60">Sem horários disponíveis.</p>}
          {days.map(([day, slots]) => (
            <div key={day}>
              <div className="mb-2 text-sm font-semibold capitalize text-white/80">{day}</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button key={s.start} type="button" onClick={() => setSelected(s.start)} className="rounded-lg border px-2 py-2 text-sm"
                    style={selected === s.start ? { background: PURPLE, borderColor: PURPLE } : { borderColor: "rgba(255,255,255,0.18)" }}>
                    {fmtTime(s.start)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {status === "error" && <p className="mt-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{errorMsg}</p>}
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => setView("home")} className="rounded-xl border border-white/20 px-4 py-3 text-sm">Voltar</button>
          <button type="button" disabled={!selected || status === "submitting"} onClick={async () => { if (await call("reschedule", { startISO: selected })) { setNewStart(selected); setStatus("rescheduled"); } }}
            className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-40" style={{ background: ORANGE }}>
            {status === "submitting" ? "Remarcando..." : "Confirmar novo horário"}
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold">Seu agendamento</h1>
      <p className="mt-2 text-white/80">{fmtFull(initial.currentStartAt)} <span className="text-white/50">({tz})</span></p>
      {initial.bookingType && <p className="mt-1 text-sm text-white/60">{initial.bookingType.name} · {initial.bookingType.durationMinutes} min</p>}
      {status === "error" && <p className="mt-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{errorMsg}</p>}
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => setView("reschedule")} className="flex-1 rounded-xl py-3 font-medium text-white" style={{ background: PURPLE }}>Remarcar</button>
        <button type="button" disabled={status === "submitting"} onClick={async () => { if (await call("cancel")) setStatus("cancelled"); }}
          className="flex-1 rounded-xl border border-red-400/40 py-3 font-medium text-red-200 disabled:opacity-40">Cancelar</button>
      </div>
    </Shell>
  );
}
