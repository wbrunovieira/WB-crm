"use client";

import { useEffect, useMemo, useState } from "react";

interface Slot { start: string; end: string }
interface BookingData {
  bookingType: { name: string; durationMinutes: number; timeZone: string };
  locationModes: ("online" | "presential")[];
  lead: { name: string; address: string | null } | null;
  slots: Slot[];
}

const LOGO_WB_WHITE = "https://crm.wbdigitalsolutions.com/email-assets/logo-wb-white.svg";
const LOGO_WB = "https://crm.wbdigitalsolutions.com/email-assets/logo-wb.svg";
const LOGO_SALTO = "https://crm.wbdigitalsolutions.com/email-assets/logo-salto.svg";

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const bodyFont = { fontFamily: "var(--font-body), system-ui, sans-serif" } as const;

/* Atmospheric background — layered glows over deep purple, with grain. */
function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: "#2a0038" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% -10%, #4a0a5e 0%, #350045 45%, #240030 100%)" }} />
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full opacity-50 blur-[120px]" style={{ background: "#792990" }} />
      <div className="absolute -bottom-40 -right-20 h-[26rem] w-[26rem] rounded-full opacity-30 blur-[130px]" style={{ background: "#e8531e" }} />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full opacity-20 blur-[120px]" style={{ background: "#b06fd0" }} />
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />
    </div>
  );
}

export function BookingClient({ token, backend, initial }: { token: string; backend: string; initial: BookingData | null }) {
  const tz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Sao_Paulo"; }
  }, []);
  const tzShort = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const presentialAvailable = !!initial?.locationModes.includes("presential");
  const isGeneric = !initial?.lead;

  const [mode, setMode] = useState<"online" | "presential">("online");
  const [address, setAddress] = useState(initial?.lead?.address ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ meetLink: string | null; startAt: string; mode: string; manageToken: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const fmtTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const fmtDayLong = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long" }).format(new Date(iso));
  const fmtFull = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of initial?.slots ?? []) {
      const k = fmtDayLong(s.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, tz]);

  async function submit() {
    if (!selected) return;
    setStatus("submitting"); setErrorMsg("");
    try {
      const res = await fetch(`${backend}/public/booking/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startISO: selected, mode,
          ...(mode === "presential" ? { address } : {}),
          ...(isGeneric ? { attendeeName: name, attendeeEmail: email, attendeeWhatsapp: whatsapp } : {}),
        }),
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

  const Page = ({ children }: { children: React.ReactNode }) => (
    <div style={bodyFont} className="relative min-h-screen text-white">
      <Atmosphere />
      <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10 sm:py-14">
        {children}
        <Footer />
      </div>
    </div>
  );

  const Footer = () => (
    <div className="mt-10 flex flex-col items-center gap-3 pb-2 text-center">
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/35">uma parceria</span>
      <div className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-2.5 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_WB} alt="WB Digital Solutions" height={20} style={{ height: 20, width: "auto" }} />
        <span className="text-lg font-light text-[#350045]/40">×</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SALTO} alt="Salto" height={20} style={{ height: 20, width: "auto" }} />
      </div>
      <span className="text-[11px] text-white/30">wbdigitalsolutions.com</span>
    </div>
  );

  const reveal = (i: number) => ({
    transition: "opacity .6s ease, transform .6s ease",
    transitionDelay: `${i * 70}ms`,
    opacity: mounted ? 1 : 0,
    transform: mounted ? "none" : "translateY(14px)",
  });

  // ── Invalid link ──────────────────────────────────────────────────────────
  if (!initial) {
    return (
      <Page>
        <Brand />
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">🔗</div>
          <h1 style={display} className="text-2xl font-semibold">Link indisponível</h1>
          <p className="mt-2 text-white/65">Este link de agendamento é inválido ou expirou. Fale com a gente para receber um novo.</p>
          <a href="https://www.wbdigitalsolutions.com" className="mt-6 inline-block rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/15">
            Ir para wbdigitalsolutions.com
          </a>
        </div>
      </Page>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (status === "done" && result) {
    return (
      <Page>
        <Brand />
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl" style={reveal(1)}>
          <div className="flex flex-col items-center px-7 pt-9 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8531e] text-3xl shadow-[0_8px_30px_rgba(232,83,30,0.45)]">✓</div>
            <h1 style={display} className="text-[1.7rem] font-bold leading-tight">Tudo certo! Reunião confirmada</h1>
            <p className="mt-3 text-white/80">
              {initial.lead?.name ? `Até breve, ${initial.lead.name.split(" ")[0]}. ` : ""}Mal podemos esperar para conversar.
            </p>
          </div>
          <div className="mx-7 my-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-wider text-white/45">Quando</div>
            <div className="mt-1 text-lg font-semibold capitalize">{fmtFull(result.startAt)}</div>
            <div className="mt-0.5 text-xs text-white/45">no seu fuso ({tzShort})</div>
            <div className="mt-4 border-t border-white/10 pt-4 text-sm">
              {result.mode === "online" ? (
                <span className="text-white/70">💻 Online · Google Meet</span>
              ) : (
                <span className="text-white/70">📍 Presencial · {address || "endereço confirmado"}</span>
              )}
            </div>
          </div>
          {result.mode === "online" && result.meetLink && (
            <div className="px-7">
              <a href={result.meetLink} target="_blank" rel="noreferrer"
                className="block w-full rounded-2xl bg-[#e8531e] py-3.5 text-center font-semibold text-white shadow-[0_8px_30px_rgba(232,83,30,0.4)] transition hover:brightness-110">
                Entrar no Google Meet
              </a>
            </div>
          )}
          <p className="px-7 pt-5 text-center text-sm text-white/55">📩 Enviamos um convite para o seu e-mail, com o evento já no Google Agenda.</p>
          <div className="px-7 pb-7 pt-4 text-center">
            <a href={`/book/manage/${result.manageToken}`} className="text-sm text-white/55 underline-offset-4 transition hover:text-white hover:underline">
              Precisa remarcar ou cancelar?
            </a>
          </div>
        </div>
      </Page>
    );
  }

  const confirmDisabled = !selected || status === "submitting" || (isGeneric && (!name.trim() || !email.trim()));

  // ── Booking ───────────────────────────────────────────────────────────────
  return (
    <Page>
      <div style={reveal(0)}><Brand /></div>

      {/* Hero */}
      <header className="mt-9" style={reveal(1)}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e8531e]" /> Agendamento
        </span>
        <h1 style={display} className="mt-4 text-[2rem] font-bold leading-[1.1] sm:text-[2.4rem]">
          {initial.lead?.name ? (
            <>Olá, {initial.lead.name.split(" ")[0]}.<br /><span className="text-white/85">Vamos conversar?</span></>
          ) : (
            <>Vamos conversar<br /><span className="text-white/85">sobre o seu projeto?</span></>
          )}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65">
          Escolha o melhor horário para uma conversa de <strong className="font-semibold text-white">{initial.bookingType.durationMinutes} minutos</strong> — direto ao ponto, sem compromisso.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[`⏱ ${initial.bookingType.durationMinutes} min`, "💻 Google Meet", "🔒 Sem compromisso"].map((c) => (
            <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/65">{c}</span>
          ))}
        </div>
      </header>

      {/* Card */}
      <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl sm:p-6" style={reveal(2)}>
        {presentialAvailable && (
          <div className="mb-6">
            <div className="mb-2.5 text-sm font-semibold text-white/85">Como você prefere?</div>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { m: "online" as const, icon: "💻", t: "Online", d: "Google Meet" },
                { m: "presential" as const, icon: "📍", t: "Presencial", d: "Pessoalmente" },
              ]).map((o) => {
                const on = mode === o.m;
                return (
                  <button key={o.m} type="button" aria-pressed={on} onClick={() => setMode(o.m)}
                    className="rounded-2xl border p-3 text-left transition"
                    style={on
                      ? { borderColor: "#e8531e", background: "rgba(232,83,30,0.12)" }
                      : { borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
                    <div className="text-xl">{o.icon}</div>
                    <div className="mt-1 text-sm font-semibold">{o.t}</div>
                    <div className="text-xs text-white/55">{o.d}</div>
                  </button>
                );
              })}
            </div>
            {mode === "presential" && (
              <div className="mt-3">
                <label className="text-xs font-medium text-white/60">Confirme (ou ajuste) o endereço</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition focus:border-[#e8531e]/70 focus:bg-white/[0.09]"
                  placeholder="Endereço do encontro" />
              </div>
            )}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/85">Escolha um horário</span>
          <span className="text-[11px] text-white/45">seu fuso · {tzShort}</span>
        </div>

        <div className="-mr-1 max-h-[46vh] space-y-5 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {days.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              Sem horários disponíveis no momento.<br />Fale com a gente que encontramos um horário.
            </div>
          )}
          {days.map(([day, slots]) => (
            <div key={day}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-semibold capitalize text-white/65">{day}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => {
                  const on = selected === s.start;
                  return (
                    <button key={s.start} type="button" aria-pressed={on} onClick={() => setSelected(s.start)}
                      className="rounded-xl border py-2.5 text-sm font-medium tabular-nums transition active:scale-[0.97]"
                      style={on
                        ? { borderColor: "#e8531e", background: "#e8531e", boxShadow: "0 6px 20px rgba(232,83,30,0.4)" }
                        : { borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
                      {fmtTime(s.start)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {isGeneric && selected && (
          <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
            <div className="text-sm font-semibold text-white/85">Seus dados</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition focus:border-[#e8531e]/70 focus:bg-white/[0.09]" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Seu e-mail"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition focus:border-[#e8531e]/70 focus:bg-white/[0.09]" />
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="WhatsApp (com DDD)"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/35 outline-none transition focus:border-[#e8531e]/70 focus:bg-white/[0.09]" />
            <p className="text-[11px] text-white/40">🔒 Usamos seus dados apenas para confirmar e lembrar da reunião.</p>
          </div>
        )}

        {status === "error" && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-100">{errorMsg}</p>
        )}

        <button type="button" disabled={confirmDisabled} onClick={submit}
          className="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "#e8531e", boxShadow: confirmDisabled ? "none" : "0 10px 34px rgba(232,83,30,0.42)" }}>
          {status === "submitting"
            ? "Confirmando..."
            : selected
              ? <span className="capitalize">Confirmar · {fmtFull(selected)}</span>
              : "Selecione um horário"}
        </button>
      </section>
    </Page>
  );
}

/* WB logo (white) — sits on the dark hero. */
function Brand() {
  return (
    <div className="flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_WB_WHITE} alt="WB Digital Solutions" height={30} style={{ height: 30, width: "auto" }} />
    </div>
  );
}
