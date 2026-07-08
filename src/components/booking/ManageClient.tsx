"use client";

import { useMemo, useState } from "react";

interface Slot { start: string; end: string }
interface ManageData {
  status: string;
  currentStartAt: string;
  bookingType: { name: string; timeZone: string; durationMinutes: number } | null;
  slots: Slot[];
}

const LOGO_WB_WHITE = "https://crm.wbdigitalsolutions.com/email-assets/logo-wb-white.svg";
const LOGO_WB = "https://crm.wbdigitalsolutions.com/email-assets/logo-wb.svg";
const WB_SITE = "https://www.wbdigitalsolutions.com";
const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const bodyFont = { fontFamily: "var(--font-body), system-ui, sans-serif" } as const;

function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: "#2a0038" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% -10%, #4a0a5e 0%, #350045 45%, #240030 100%)" }} />
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full opacity-50 blur-[120px]" style={{ background: "#792990" }} />
      <div className="absolute -bottom-40 -right-20 h-[26rem] w-[26rem] rounded-full opacity-30 blur-[130px]" style={{ background: "#e8531e" }} />
    </div>
  );
}

export function ManageClient({ manageToken, backend, initial }: { manageToken: string; backend: string; initial: ManageData | null }) {
  const tz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Sao_Paulo"; } }, []);
  const tzShort = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const [view, setView] = useState<"home" | "reschedule">("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "rescheduled" | "cancelled" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [newStart, setNewStart] = useState<string | null>(null);

  const fmtTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const fmtDayLong = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long" }).format(new Date(iso));
  const fmtFull = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of initial?.slots ?? []) { const k = fmtDayLong(s.start); if (!map.has(k)) map.set(k, []); map.get(k)!.push(s); }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const Page = ({ children }: { children: React.ReactNode }) => (
    <div style={bodyFont} className="relative min-h-screen text-white">
      <Atmosphere />
      <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-12 sm:py-16">
        <div className="flex flex-col items-center">
          <a href={WB_SITE} target="_blank" rel="noreferrer" className="transition hover:opacity-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_WB_WHITE} alt="WB Digital Solutions" height={52} style={{ height: 52, width: "auto" }} />
          </a>
        </div>
        <div className="mt-9">{children}</div>
        <div className="mt-auto flex flex-col items-center gap-3 pt-10 text-center">
          <a href={WB_SITE} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-full bg-white px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_WB} alt="WB Digital Solutions" height={26} style={{ height: 26, width: "auto" }} />
          </a>
        </div>
      </div>
    </div>
  );

  const card = "rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl shadow-2xl";

  if (!initial) return <Page><div className={`${card} text-center`}><div className="mb-3 text-3xl">🔗</div><h1 style={display} className="text-xl font-semibold">Link indisponível</h1><p className="mt-2 text-white/65">Este link é inválido ou expirou.</p></div></Page>;

  if (status === "cancelled" || initial.status === "cancelled") {
    return <Page><div className={`${card} text-center`}><div className="mb-3 text-3xl">🗑️</div><h1 style={display} className="text-xl font-bold">Agendamento cancelado</h1><p className="mt-2 text-white/65">Se foi sem querer, fale com a gente para reagendar.</p></div></Page>;
  }

  if (status === "rescheduled" && newStart) {
    return <Page><div className={`${card} text-center`}><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8531e] text-2xl shadow-[0_8px_30px_rgba(232,83,30,0.45)]">✓</div><h1 style={display} className="text-xl font-bold">Reunião remarcada!</h1><p className="mt-2 capitalize text-white/80">{fmtFull(newStart)} <span className="text-white/70">({tzShort})</span></p><p className="mt-4 text-sm text-white/70">Atualizamos o convite no seu e-mail.</p></div></Page>;
  }

  if (view === "reschedule") {
    return (
      <Page>
        <div className={card}>
          <h1 style={display} className="text-xl font-bold">Escolha um novo horário</h1>
          <p className="mt-1 text-xs text-white/65">seu fuso · {tzShort}</p>
          <div className="mt-5 max-h-[48vh] space-y-5 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {days.length === 0 && <p className="text-white/60">Sem horários disponíveis.</p>}
            {days.map(([day, slots]) => (
              <div key={day}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-px flex-1 bg-white/20" /><span className="text-xs font-semibold capitalize text-white/85">{day}</span><span className="h-px flex-1 bg-white/20" />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => {
                    const on = selected === s.start;
                    return (
                      <button key={s.start} type="button" aria-pressed={on} onClick={() => setSelected(s.start)}
                        className="rounded-xl border py-2.5 text-sm font-semibold tabular-nums text-white/90 transition active:scale-[0.97]"
                        style={on ? { borderColor: "#e8531e", background: "#e8531e", boxShadow: "0 6px 20px rgba(232,83,30,0.4)" } : { borderColor: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.08)" }}>
                        {fmtTime(s.start)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {status === "error" && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-100">{errorMsg}</p>}
          <div className="mt-6 flex gap-2.5">
            <button type="button" onClick={() => setView("home")} className="rounded-2xl border border-white/15 px-5 py-3 text-sm transition hover:bg-white/5">Voltar</button>
            <button type="button" disabled={!selected || status === "submitting"} onClick={async () => { if (await call("reschedule", { startISO: selected })) { setNewStart(selected); setStatus("rescheduled"); } }}
              className="flex-1 rounded-2xl py-3 font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
              style={{ background: "#e8531e", boxShadow: selected ? "0 10px 34px rgba(232,83,30,0.42)" : "none" }}>
              {status === "submitting" ? "Remarcando..." : "Confirmar novo horário"}
            </button>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className={card}>
        <div className="text-xs uppercase tracking-wider text-white/65">Seu agendamento</div>
        <h1 style={display} className="mt-1 text-2xl font-bold capitalize">{fmtFull(initial.currentStartAt)}</h1>
        <p className="mt-1 text-sm text-white/70">no seu fuso ({tzShort})</p>
        {initial.bookingType && <p className="mt-3 inline-block rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/80">{initial.bookingType.name} · {initial.bookingType.durationMinutes} min</p>}
        {status === "error" && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-100">{errorMsg}</p>}
        <div className="mt-6 flex gap-2.5">
          <button type="button" onClick={() => setView("reschedule")} className="flex-1 rounded-2xl py-3 font-semibold text-white transition hover:brightness-110" style={{ background: "#792990" }}>Remarcar</button>
          <button type="button" disabled={status === "submitting"} onClick={async () => { if (await call("cancel")) setStatus("cancelled"); }}
            className="flex-1 rounded-2xl border border-red-400/40 py-3 font-medium text-red-200 transition hover:bg-red-500/10 disabled:opacity-40">Cancelar</button>
        </div>
      </div>
    </Page>
  );
}
