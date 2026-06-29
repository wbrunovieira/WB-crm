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
const LOGO_SALTO = "https://crm.wbdigitalsolutions.com/email-assets/logo-salto.svg";
const WB = "#792990"; // cor de destaque da WB

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const bodyFont = { fontFamily: "var(--font-body), system-ui, sans-serif" } as const;

/* Atmospheric background — layered glows over deep purple, with grain. */
function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: "#2a0038" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% -10%, #4a0a5e 0%, #350045 45%, #240030 100%)" }} />
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full opacity-50 blur-[120px]" style={{ background: "#792990" }} />
      <div className="absolute -bottom-40 -right-20 h-[26rem] w-[26rem] rounded-full opacity-30 blur-[130px]" style={{ background: "#792990" }} />
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
      <style>{`
        @keyframes slotIn { from { opacity: 0; transform: translateY(10px) scale(.94); } to { opacity: 1; transform: none; } }
        @keyframes dayIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { [data-anim] { animation: none !important; } }
      `}</style>
      <Atmosphere />
      <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10 sm:py-14">
        {children}
        <Footer />
      </div>
    </div>
  );

  const Footer = () => (
    <div className="mt-10 flex flex-col items-center gap-3 pb-2 text-center">
      <div className="flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_WB_WHITE} alt="WB Digital Solutions" height={28} style={{ height: 28, width: "auto" }} />
        <span className="h-7 w-px bg-white/25" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SALTO} alt="Salto" height={26} style={{ height: 26, width: "auto" }} />
      </div>
      <span className="max-w-sm text-[12.5px] leading-relaxed text-white/70">
        WB Digital Solutions e Salto — <span className="font-medium text-white/90">a mesma equipe</span>. Você pode nos conhecer por qualquer um dos dois nomes.
      </span>
    </div>
  );

  const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  const reveal = (i: number) => ({
    transition: `opacity .65s ${EASE}, transform .65s ${EASE}`,
    transitionDelay: `${i * 90}ms`,
    opacity: mounted ? 1 : 0,
    transform: mounted ? "none" : "translateY(18px) scale(0.985)",
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
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#792990] text-3xl shadow-[0_8px_30px_rgba(121,41,144,0.45)]">✓</div>
            <h1 style={display} className="text-[1.7rem] font-bold leading-tight">Tudo certo! Reunião confirmada</h1>
            <p className="mt-3 text-white/80">
              {initial.lead?.name ? `Até breve, ${initial.lead.name.split(" ")[0]}. ` : ""}Mal podemos esperar para conversar.
            </p>
          </div>
          <div className="mx-7 my-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-wider text-white/65">Quando</div>
            <div className="mt-1 text-lg font-semibold capitalize">{fmtFull(result.startAt)}</div>
            <div className="mt-0.5 text-xs text-white/65">no seu fuso ({tzShort})</div>
            <div className="mt-4 border-t border-white/10 pt-4 text-sm">
              {result.mode === "online" ? (
                <span className="inline-flex items-center gap-2 text-white/70"><MeetIcon size={16} /> Online · Google Meet</span>
              ) : (
                <span className="text-white/70">📍 Presencial · {address || "endereço confirmado"}</span>
              )}
            </div>
          </div>
          {result.mode === "online" && result.meetLink && (
            <div className="px-7">
              <a href={result.meetLink} target="_blank" rel="noreferrer"
                className="block w-full rounded-2xl bg-[#792990] py-3.5 text-center font-semibold text-white shadow-[0_8px_30px_rgba(121,41,144,0.4)] transition hover:brightness-110">
                Entrar no Google Meet
              </a>
            </div>
          )}
          <p className="px-7 pt-5 text-center text-sm text-white/70">📩 Enviamos um convite para o seu e-mail, com o evento já no Google Agenda.</p>
          <div className="px-7 pb-7 pt-4 text-center">
            <a href={`/book/manage/${result.manageToken}`} className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline">
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
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75">
          <span className="h-1.5 w-1.5 rounded-full bg-[#b06fd0]" /> {initial.bookingType.name}
        </span>
        <h1 style={display} className="mt-4 text-[2rem] font-bold leading-[1.1] sm:text-[2.4rem]">
          {initial.lead?.name ? (
            <>Olá, {initial.lead.name.split(" ")[0]}.<br /><span className="text-white/85">Vamos conversar?</span></>
          ) : (
            <>Vamos conversar<br /><span className="text-white/85">sobre o seu projeto?</span></>
          )}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
          Escolha o melhor horário para uma conversa de <strong className="font-semibold text-white">{initial.bookingType.durationMinutes} minutos</strong> — direto ao ponto, sobre o seu negócio.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/80">⏱ {initial.bookingType.durationMinutes} min</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/80"><MeetIcon size={13} /> Google Meet</span>
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/80">✅ Confirmação na hora</span>
        </div>
      </header>

      {/* Card */}
      <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl sm:p-6" style={reveal(2)}>
        {presentialAvailable && (
          <div className="mb-6">
            <div className="mb-2.5 text-sm font-semibold text-white/85">Como você prefere?</div>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { m: "online" as const, icon: <MeetIcon size={22} />, t: "Online", d: "Google Meet" },
                { m: "presential" as const, icon: "📍", t: "Presencial", d: "Pessoalmente" },
              ]).map((o) => {
                const on = mode === o.m;
                return (
                  <button key={o.m} type="button" aria-pressed={on} onClick={() => setMode(o.m)}
                    className="rounded-2xl border p-3 text-left transition"
                    style={on
                      ? { borderColor: "#b06fd0", background: "rgba(121,41,144,0.30)" }
                      : { borderColor: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.08)" }}>
                    <div className="text-xl">{o.icon}</div>
                    <div className="mt-1 text-sm font-semibold">{o.t}</div>
                    <div className="text-xs text-white/70">{o.d}</div>
                  </button>
                );
              })}
            </div>
            {mode === "presential" && (
              <div className="mt-3">
                <label className="text-xs font-medium text-white/60">Confirme (ou ajuste) o endereço</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]"
                  placeholder="Endereço do encontro" />
              </div>
            )}
          </div>
        )}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 style={display} className="text-xl font-bold leading-tight text-white">Escolha um horário</h2>
            <p className="mt-1 text-xs text-white/55">Toque no melhor horário para você</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70" title="Horários exibidos no seu fuso horário">
            🌐 {tzShort}
          </span>
        </div>

        <div className="-mr-1 max-h-[46vh] space-y-6 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {days.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              Sem horários disponíveis no momento.<br />Fale com a gente que encontramos um horário.
            </div>
          )}
          {days.map(([day, slots], dayIdx) => (
            <div key={day} data-anim style={{ animation: `dayIn .5s ${EASE} both`, animationDelay: `${dayIdx * 80}ms` }}>
              <div className="mb-2.5 flex items-baseline gap-2 border-b border-white/10 pb-2">
                <span className="h-2 w-2 rounded-full" style={{ background: "#b06fd0" }} />
                <span className="text-[13px] font-semibold capitalize text-white">{day}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s, i) => {
                  const on = selected === s.start;
                  const delay = Math.min(dayIdx * 90 + i * 35, 700);
                  return (
                    <button key={s.start} type="button" aria-pressed={on} onClick={() => setSelected(s.start)} data-anim
                      className={`rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition-all duration-200 active:scale-[0.96] ${
                        on
                          ? "text-white"
                          : "border-white/20 bg-white/[0.07] text-white/90 hover:-translate-y-0.5 hover:border-[#b06fd0]/80 hover:bg-white/[0.16] hover:text-white hover:shadow-[0_8px_22px_rgba(121,41,144,0.4)]"
                      }`}
                      style={on
                        ? { borderColor: "#b06fd0", background: WB, boxShadow: "0 6px 22px rgba(121,41,144,0.6)", animation: `slotIn .45s ${EASE} both`, animationDelay: `${delay}ms` }
                        : { animation: `slotIn .45s ${EASE} both`, animationDelay: `${delay}ms` }}>
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
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Seu e-mail"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]" />
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="WhatsApp (com DDD)"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]" />
            <p className="text-[11px] text-white/60">🔒 Usamos seus dados apenas para confirmar e lembrar da reunião.</p>
          </div>
        )}

        {status === "error" && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-100">{errorMsg}</p>
        )}

        <button type="button" disabled={confirmDisabled} onClick={submit}
          className="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #9d3bc4 0%, #792990 100%)", boxShadow: confirmDisabled ? "none" : "0 12px 36px rgba(121,41,144,0.6)" }}>
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

/* WB logo (white) — sits on the dark hero, anchored with a hairline + kicker. */
function Brand() {
  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_WB_WHITE} alt="WB Digital Solutions" height={60} style={{ height: 60, width: "auto" }} />
      <div className="mt-3 flex items-center gap-2.5">
        <span className="h-px w-7 bg-white/25" />
        <span className="text-[10.5px] font-medium uppercase tracking-[0.32em] text-white/70">Agendamento</span>
        <span className="h-px w-7 bg-white/25" />
      </div>
    </div>
  );
}

/* Google Meet logo (colorido) */
function MeetIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 87.5 72" style={{ height: size, width: size * 1.215, display: "inline-block", verticalAlign: "middle" }} aria-hidden>
      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z" />
      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z" />
      <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z" />
      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z" />
      <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.32zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z" />
      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z" />
    </svg>
  );
}
