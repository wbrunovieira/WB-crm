"use client";

import { useMemo, useState } from "react";

interface Slot { start: string; end: string }
interface BookingData {
  bookingType: { name: string; durationMinutes: number; timeZone: string };
  locationModes: ("online" | "presential")[];
  lead: { name: string; address: string | null } | null;
  slots: Slot[];
}

const PURPLE = "#792990";
const ORANGE = "#e8531e";

export function BookingClient({ token, backend, initial }: { token: string; backend: string; initial: BookingData | null }) {
  const tz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Sao_Paulo"; }
  }, []);
  const presentialAvailable = !!initial?.locationModes.includes("presential");

  const [mode, setMode] = useState<"online" | "presential">("online");
  const [address, setAddress] = useState(initial?.lead?.address ?? "");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ meetLink: string | null; startAt: string; mode: string; manageToken: string } | null>(null);

  const fmtTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const fmtDay = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long" }).format(new Date(iso));
  const fmtFull = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of initial?.slots ?? []) {
      const k = fmtDay(s.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [initial, tz]);

  async function submit() {
    if (!selected) return;
    setStatus("submitting"); setErrorMsg("");
    try {
      const res = await fetch(`${backend}/public/booking/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startISO: selected, mode, ...(mode === "presential" ? { address } : {}) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Não foi possível agendar. Tente outro horário.");
      }
      setResult(await res.json());
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao agendar");
      setStatus("error");
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: "100vh", background: "#350045" }} className="flex items-start justify-center px-4 py-10 text-white">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="text-sm tracking-widest text-white/60">WB DIGITAL SOLUTIONS</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">{children}</div>
        <p className="mt-6 text-center text-xs text-white/40">© WB Digital Solutions · wbdigitalsolutions.com</p>
      </div>
    </div>
  );

  if (!initial) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Link indisponível</h1>
        <p className="mt-2 text-white/70">Este link de agendamento é inválido ou expirou. Fale com a gente para receber um novo.</p>
      </Shell>
    );
  }

  if (status === "done" && result) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-3xl">✓</div>
          <h1 className="text-2xl font-bold">Reunião agendada!</h1>
          <p className="mt-2 text-white/80">{fmtFull(result.startAt)} <span className="text-white/50">({tz})</span></p>
          {result.mode === "online" && result.meetLink && (
            <a href={result.meetLink} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg px-5 py-2.5 font-medium text-white" style={{ background: PURPLE }}>
              Entrar no Google Meet
            </a>
          )}
          {result.mode === "presential" && (
            <p className="mt-3 text-white/70">📍 Presencial — {address}</p>
          )}
          <p className="mt-5 text-sm text-white/60">Você também recebeu um convite no seu e-mail (com o evento no Google Agenda).</p>
          <a href={`/book/manage/${result.manageToken}`} className="mt-4 inline-block text-sm underline text-white/70 hover:text-white">
            Precisa remarcar ou cancelar?
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold">Agende uma reunião</h1>
      <p className="mt-1 text-white/70">
        {initial.lead?.name ? <><strong>{initial.lead.name}</strong>, escolha </> : "Escolha "}
        o melhor horário — {initial.bookingType.name} ({initial.bookingType.durationMinutes} min).
      </p>
      <p className="mt-1 text-xs text-white/50">Horários no seu fuso ({tz}). Bruno está em horário de Brasília (BRT).</p>

      {presentialAvailable && (
        <div className="mt-5">
          <div className="mb-2 text-sm font-medium text-white/80">Como prefere?</div>
          <div className="flex gap-2">
            {(["online", "presential"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition"
                style={mode === m ? { background: PURPLE, borderColor: PURPLE } : { borderColor: "rgba(255,255,255,0.2)" }}>
                {m === "online" ? "💻 Online (Meet)" : "📍 Presencial"}
              </button>
            ))}
          </div>
          {mode === "presential" && (
            <div className="mt-3">
              <label className="text-xs text-white/60">Confirme (ou ajuste) o endereço</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
                placeholder="Endereço do encontro" />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 max-h-[50vh] space-y-5 overflow-y-auto pr-1">
        {days.length === 0 && <p className="text-white/60">Sem horários disponíveis no momento. Fale com a gente.</p>}
        {days.map(([day, slots]) => (
          <div key={day}>
            <div className="mb-2 text-sm font-semibold capitalize text-white/80">{day}</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button key={s.start} type="button" onClick={() => setSelected(s.start)}
                  className="rounded-lg border px-2 py-2 text-sm transition"
                  style={selected === s.start ? { background: PURPLE, borderColor: PURPLE } : { borderColor: "rgba(255,255,255,0.18)" }}>
                  {fmtTime(s.start)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {status === "error" && <p className="mt-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{errorMsg}</p>}

      <button type="button" disabled={!selected || status === "submitting"} onClick={submit}
        className="mt-6 w-full rounded-xl py-3 text-base font-semibold text-white transition disabled:opacity-40"
        style={{ background: ORANGE }}>
        {status === "submitting" ? "Agendando..." : selected ? `Confirmar ${fmtFull(selected)}` : "Selecione um horário"}
      </button>
    </Shell>
  );
}
