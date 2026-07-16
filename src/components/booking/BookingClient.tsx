"use client";

import { useEffect, useMemo, useState } from "react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

interface Slot { start: string; end: string }
interface BookingData {
  bookingType: { name: string; durationMinutes: number; timeZone: string };
  locationModes: ("online" | "presential")[];
  lead: { name: string; address: string | null; email: string | null } | null;
  slots: Slot[];
}

const LOGO_WB_WHITE = "https://crm.wbdigitalsolutions.com/email-assets/logo-wb-white.svg";
const WB_SITE = "https://www.wbdigitalsolutions.com";
const WB = "#792990"; // cor de destaque da WB

const display = { fontFamily: "var(--font-display), Georgia, serif" } as const;
const bodyFont = { fontFamily: "var(--font-body), system-ui, sans-serif" } as const;

// ── i18n ──────────────────────────────────────────────────────────────────────
// The public booking page is shared with leads worldwide, so it speaks pt/en/es/it.
// Language auto-detects from ?lang= then the browser, defaulting to pt.
type Lang = "pt" | "en" | "es" | "it";
const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "pt", flag: "🇧🇷", label: "Português" },
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
];
const LOCALE: Record<Lang, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", it: "it-IT" };

interface Dict {
  kicker: string;
  invalidTitle: string;
  invalidBody: string;
  invalidCta: string;
  successTitle: string;
  successBye: (name: string) => string;
  successByeNoName: string;
  when: string;
  inYourTz: (tz: string) => string;
  online: string;
  presential: string;
  presentialSub: string;
  onlineSub: string;
  presentialAt: (addr: string) => string;
  addressConfirmed: string;
  joinMeet: string;
  emailSent: string;
  rescheduleQ: string;
  greetingName: (n: string) => string;
  talkQ: string;
  noLeadL1: string;
  noLeadL2: string;
  heroDescPre: string;
  heroStrongMinutes: (min: number) => string;
  heroDescPost: string;
  minChip: (min: number) => string;
  confirmChip: string;
  modeQ: string;
  addressLabel: string;
  addressPh: string;
  chooseTime: string;
  chooseTimeSub: string;
  noSlots1: string;
  noSlots2: string;
  yourData: string;
  namePh: string;
  emailPh: string;
  whatsappPh: string;
  privacy: string;
  errorFallback: string;
  errorGeneric: string;
  confirming: string;
  confirmPrefix: string;
  selectTimeCta: string;
  tzTitle: string;
  countryAria: string;
}

const DICT: Record<Lang, Dict> = {
  pt: {
    kicker: "Agendamento",
    invalidTitle: "Link indisponível",
    invalidBody: "Este link de agendamento é inválido ou expirou. Fale com a gente para receber um novo.",
    invalidCta: "Ir para wbdigitalsolutions.com",
    successTitle: "Tudo certo! Reunião confirmada",
    successBye: (n) => `Até breve, ${n}!`,
    successByeNoName: "Seu horário está reservado.",
    when: "Quando",
    inYourTz: (tz) => `no seu fuso (${tz})`,
    online: "Online",
    onlineSub: "Google Meet",
    presential: "Presencial",
    presentialSub: "Pessoalmente",
    presentialAt: (a) => `📍 Presencial · ${a}`,
    addressConfirmed: "endereço confirmado",
    joinMeet: "Entrar no Google Meet",
    emailSent: "📩 Enviamos um convite para o seu e-mail, com o evento já no Google Agenda.",
    rescheduleQ: "Precisa remarcar ou cancelar?",
    greetingName: (n) => `Olá, ${n}.`,
    talkQ: "Vamos conversar?",
    noLeadL1: "Vamos conversar",
    noLeadL2: "sobre o seu projeto?",
    heroDescPre: "Escolha o melhor horário para uma conversa de ",
    heroStrongMinutes: (m) => `${m} minutos`,
    heroDescPost: " — direto ao ponto, sobre o seu negócio.",
    minChip: (m) => `⏱ ${m} min`,
    confirmChip: "✅ Confirmação na hora",
    modeQ: "Como você prefere?",
    addressLabel: "Confirme (ou ajuste) o endereço",
    addressPh: "Endereço do encontro",
    chooseTime: "Escolha um horário",
    chooseTimeSub: "Toque no melhor horário para você",
    noSlots1: "Sem horários disponíveis no momento.",
    noSlots2: "Fale com a gente que encontramos um horário.",
    yourData: "Seus dados",
    namePh: "Seu nome",
    emailPh: "Seu e-mail",
    whatsappPh: "WhatsApp (DDD + número)",
    privacy: "🔒 Usamos seus dados apenas para confirmar e lembrar da reunião.",
    errorFallback: "Não foi possível agendar. Tente outro horário.",
    errorGeneric: "Erro ao agendar",
    confirming: "Confirmando...",
    confirmPrefix: "Confirmar",
    selectTimeCta: "Selecione um horário",
    tzTitle: "Horários exibidos no seu fuso horário",
    countryAria: "País",
  },
  en: {
    kicker: "Scheduling",
    invalidTitle: "Link unavailable",
    invalidBody: "This scheduling link is invalid or has expired. Get in touch to receive a new one.",
    invalidCta: "Go to wbdigitalsolutions.com",
    successTitle: "All set! Meeting confirmed",
    successBye: (n) => `See you soon, ${n}!`,
    successByeNoName: "Your time slot is reserved.",
    when: "When",
    inYourTz: (tz) => `in your time zone (${tz})`,
    online: "Online",
    onlineSub: "Google Meet",
    presential: "In person",
    presentialSub: "Face to face",
    presentialAt: (a) => `📍 In person · ${a}`,
    addressConfirmed: "confirmed address",
    joinMeet: "Join Google Meet",
    emailSent: "📩 We've sent an invite to your email, with the event already on Google Calendar.",
    rescheduleQ: "Need to reschedule or cancel?",
    greetingName: (n) => `Hi, ${n}.`,
    talkQ: "Shall we talk?",
    noLeadL1: "Let's talk",
    noLeadL2: "about your project?",
    heroDescPre: "Pick the best time for a ",
    heroStrongMinutes: (m) => `${m}-minute`,
    heroDescPost: " chat — straight to the point, about your business.",
    minChip: (m) => `⏱ ${m} min`,
    confirmChip: "✅ Instant confirmation",
    modeQ: "How do you prefer?",
    addressLabel: "Confirm (or adjust) the address",
    addressPh: "Meeting address",
    chooseTime: "Pick a time",
    chooseTimeSub: "Tap the best time for you",
    noSlots1: "No times available right now.",
    noSlots2: "Get in touch and we'll find a time.",
    yourData: "Your details",
    namePh: "Your name",
    emailPh: "Your email",
    whatsappPh: "WhatsApp (with country code)",
    privacy: "🔒 We only use your details to confirm and remind you of the meeting.",
    errorFallback: "Couldn't book. Please try another time.",
    errorGeneric: "Booking error",
    confirming: "Confirming...",
    confirmPrefix: "Confirm",
    selectTimeCta: "Select a time",
    tzTitle: "Times shown in your time zone",
    countryAria: "Country",
  },
  es: {
    kicker: "Agendamiento",
    invalidTitle: "Enlace no disponible",
    invalidBody: "Este enlace de agendamiento no es válido o ha caducado. Contáctanos para recibir uno nuevo.",
    invalidCta: "Ir a wbdigitalsolutions.com",
    successTitle: "¡Listo! Reunión confirmada",
    successBye: (n) => `¡Hasta pronto, ${n}!`,
    successByeNoName: "Tu horario está reservado.",
    when: "Cuándo",
    inYourTz: (tz) => `en tu zona horaria (${tz})`,
    online: "Online",
    onlineSub: "Google Meet",
    presential: "Presencial",
    presentialSub: "En persona",
    presentialAt: (a) => `📍 Presencial · ${a}`,
    addressConfirmed: "dirección confirmada",
    joinMeet: "Unirse a Google Meet",
    emailSent: "📩 Te enviamos una invitación a tu correo, con el evento ya en Google Calendar.",
    rescheduleQ: "¿Necesitas reprogramar o cancelar?",
    greetingName: (n) => `Hola, ${n}.`,
    talkQ: "¿Conversamos?",
    noLeadL1: "Conversemos",
    noLeadL2: "sobre tu proyecto?",
    heroDescPre: "Elige el mejor horario para una conversación de ",
    heroStrongMinutes: (m) => `${m} minutos`,
    heroDescPost: " — directo al grano, sobre tu negocio.",
    minChip: (m) => `⏱ ${m} min`,
    confirmChip: "✅ Confirmación al instante",
    modeQ: "¿Cómo prefieres?",
    addressLabel: "Confirma (o ajusta) la dirección",
    addressPh: "Dirección del encuentro",
    chooseTime: "Elige un horario",
    chooseTimeSub: "Toca el mejor horario para ti",
    noSlots1: "No hay horarios disponibles por ahora.",
    noSlots2: "Contáctanos y encontramos un horario.",
    yourData: "Tus datos",
    namePh: "Tu nombre",
    emailPh: "Tu correo",
    whatsappPh: "WhatsApp (código + número)",
    privacy: "🔒 Solo usamos tus datos para confirmar y recordarte la reunión.",
    errorFallback: "No se pudo agendar. Prueba otro horario.",
    errorGeneric: "Error al agendar",
    confirming: "Confirmando...",
    confirmPrefix: "Confirmar",
    selectTimeCta: "Selecciona un horario",
    tzTitle: "Horarios en tu zona horaria",
    countryAria: "País",
  },
  it: {
    kicker: "Prenotazione",
    invalidTitle: "Link non disponibile",
    invalidBody: "Questo link di prenotazione non è valido o è scaduto. Contattaci per riceverne uno nuovo.",
    invalidCta: "Vai a wbdigitalsolutions.com",
    successTitle: "Fatto! Riunione confermata",
    successBye: (n) => `A presto, ${n}!`,
    successByeNoName: "Il tuo orario è riservato.",
    when: "Quando",
    inYourTz: (tz) => `nel tuo fuso orario (${tz})`,
    online: "Online",
    onlineSub: "Google Meet",
    presential: "Di persona",
    presentialSub: "Faccia a faccia",
    presentialAt: (a) => `📍 Di persona · ${a}`,
    addressConfirmed: "indirizzo confermato",
    joinMeet: "Entra su Google Meet",
    emailSent: "📩 Ti abbiamo inviato un invito via email, con l'evento già su Google Calendar.",
    rescheduleQ: "Devi riprogrammare o annullare?",
    greetingName: (n) => `Ciao, ${n}.`,
    talkQ: "Parliamone?",
    noLeadL1: "Parliamo",
    noLeadL2: "del tuo progetto?",
    heroDescPre: "Scegli l'orario migliore per una chiacchierata di ",
    heroStrongMinutes: (m) => `${m} minuti`,
    heroDescPost: " — dritti al punto, sul tuo business.",
    minChip: (m) => `⏱ ${m} min`,
    confirmChip: "✅ Conferma immediata",
    modeQ: "Come preferisci?",
    addressLabel: "Conferma (o modifica) l'indirizzo",
    addressPh: "Indirizzo dell'incontro",
    chooseTime: "Scegli un orario",
    chooseTimeSub: "Tocca l'orario migliore per te",
    noSlots1: "Nessun orario disponibile al momento.",
    noSlots2: "Contattaci e troviamo un orario.",
    yourData: "I tuoi dati",
    namePh: "Il tuo nome",
    emailPh: "La tua email",
    whatsappPh: "WhatsApp (prefisso + numero)",
    privacy: "🔒 Usiamo i tuoi dati solo per confermare e ricordarti la riunione.",
    errorFallback: "Impossibile prenotare. Prova un altro orario.",
    errorGeneric: "Errore nella prenotazione",
    confirming: "Conferma in corso...",
    confirmPrefix: "Conferma",
    selectTimeCta: "Seleziona un orario",
    tzTitle: "Orari nel tuo fuso orario",
    countryAria: "Paese",
  },
};

function detectLang(): Lang {
  try {
    const url = new URLSearchParams(window.location.search).get("lang")?.slice(0, 2).toLowerCase();
    if (url && url in DICT) return url as Lang;
    const nav = navigator.language?.slice(0, 2).toLowerCase();
    if (nav && nav in DICT) return nav as Lang;
  } catch { /* SSR / no window */ }
  return "pt";
}

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

/* Language switcher — fixed top-right flag toggles. */
function LangSwitcher({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="fixed right-4 top-4 z-20 flex gap-1 rounded-full border border-white/12 bg-black/25 p-1 backdrop-blur-md">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          aria-label={l.label}
          aria-pressed={lang === l.code}
          title={l.label}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
            lang === l.code ? "bg-white/20 ring-1 ring-white/40" : "opacity-55 hover:opacity-100"
          }`}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
}

/* Footer — logo WB (link para o site), nível de módulo p/ não remontar a cada tecla. */
function Footer() {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 pb-2 text-center">
      <a href={WB_SITE} target="_blank" rel="noreferrer" className="transition hover:opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_WB_WHITE} alt="WB Digital Solutions" height={28} style={{ height: 28, width: "auto" }} />
      </a>
    </div>
  );
}

/* Wrapper da página — nível de módulo (evita remontar/perder foco do input a cada render). */
function Page({ lang, onLang, children }: { lang: Lang; onLang: (l: Lang) => void; children: React.ReactNode }) {
  return (
    <div style={bodyFont} className="relative min-h-screen text-white">
      <style>{`
        @keyframes slotIn { from { opacity: 0; transform: translateY(10px) scale(.94); } to { opacity: 1; transform: none; } }
        @keyframes dayIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { [data-anim] { animation: none !important; } }
      `}</style>
      <Atmosphere />
      <LangSwitcher lang={lang} onChange={onLang} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-10 sm:py-14">
        {children}
        <Footer />
      </div>
    </div>
  );
}

/* Lista de países (via libphonenumber-js) com bandeira + DDI, ordenada por nome pt-BR. */
const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const flagEmoji = (iso: string) => iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
const COUNTRY_OPTIONS = getCountries()
  .map((iso) => {
    let name = iso as string;
    try { name = regionNames.of(iso) ?? iso; } catch { /* keep iso */ }
    return { iso, dial: getCountryCallingCode(iso), name };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

/* Campo de WhatsApp com seletor de país (Brasil pré-selecionado). Emite E.164. */
function PhoneField({ onChange, t }: { onChange: (v: string) => void; t: Dict }) {
  const [iso, setIso] = useState<CountryCode>("BR");
  const [num, setNum] = useState("");
  const emit = (i: CountryCode, n: string) => {
    const digits = n.replace(/\D/g, "");
    onChange(digits ? `+${getCountryCallingCode(i)}${digits}` : "");
  };
  return (
    <div className="flex gap-2">
      <select
        value={iso}
        onChange={(e) => { const i = e.target.value as CountryCode; setIso(i); emit(i, num); }}
        aria-label={t.countryAria}
        className="w-[6rem] shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-2 py-2.5 text-sm text-white outline-none transition focus:border-[#792990]/70 [color-scheme:dark]"
      >
        {COUNTRY_OPTIONS.map((c) => (
          <option key={c.iso} value={c.iso} className="bg-[#2a0038] text-white">{flagEmoji(c.iso)} +{c.dial}</option>
        ))}
      </select>
      <input
        value={num}
        onChange={(e) => { setNum(e.target.value); emit(iso, e.target.value); }}
        inputMode="tel"
        placeholder={t.whatsappPh}
        className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]"
      />
    </div>
  );
}

export function BookingClient({ token, backend, initial }: { token?: string; backend: string; initial: BookingData | null }) {
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => { setLang(detectLang()); }, []);
  const t = DICT[lang];
  const locale = LOCALE[lang];

  // Start from the booking type's timezone (known at SSR) so the server HTML and the
  // first client render match; switch to the visitor's real timezone after mount.
  // Prevents a hydration mismatch on the formatted slot times (React #418/#423/#425).
  const [tz, setTz] = useState(initial?.bookingType.timeZone ?? "America/Sao_Paulo");
  const tzShort = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const presentialAvailable = !!initial?.locationModes.includes("presential");

  const [mode, setMode] = useState<"online" | "presential">("online");
  const [address, setAddress] = useState(initial?.lead?.address ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initial?.lead?.email ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ meetLink: string | null; startAt: string; mode: string; manageToken: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz) setTz(browserTz);
    } catch { /* keep the booking-type timezone */ }
  }, []);

  const fmtTime = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const fmtDayLong = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "2-digit", month: "long" }).format(new Date(iso));
  const fmtFull = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of initial?.slots ?? []) {
      const k = fmtDayLong(s.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, tz, locale]);

  async function submit() {
    if (!selected) return;
    setStatus("submitting"); setErrorMsg("");
    try {
      // Token-less /book URL posts to the base endpoint (default public link).
      const url = `${backend}/public/booking${token ? `/${encodeURIComponent(token)}` : ""}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startISO: selected, mode,
          attendeeName: name,
          attendeeEmail: email,
          attendeeWhatsapp: whatsapp,
          ...(mode === "presential" ? { address } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || t.errorFallback);
      }
      setResult(await res.json());
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t.errorGeneric);
      setStatus("error");
    }
  }


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
      <Page lang={lang} onLang={setLang}>
        <Brand kicker={t.kicker} />
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">🔗</div>
          <h1 style={display} className="text-2xl font-semibold">{t.invalidTitle}</h1>
          <p className="mt-2 text-white/65">{t.invalidBody}</p>
          <a href="https://www.wbdigitalsolutions.com" className="mt-6 inline-block rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/15">
            {t.invalidCta}
          </a>
        </div>
      </Page>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (status === "done" && result) {
    const firstName = (name.trim() || initial.lead?.name || "").split(" ")[0];
    return (
      <Page lang={lang} onLang={setLang}>
        <Brand kicker={t.kicker} />
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl" style={reveal(1)}>
          <div className="flex flex-col items-center px-7 pt-9 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#792990] text-3xl shadow-[0_8px_30px_rgba(121,41,144,0.45)]">✓</div>
            <h1 style={display} className="text-[1.7rem] font-bold leading-tight">{t.successTitle}</h1>
            <p className="mt-3 text-white/80">
              {firstName ? t.successBye(firstName) : t.successByeNoName}
            </p>
          </div>
          <div className="mx-7 my-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-wider text-white/65">{t.when}</div>
            <div className="mt-1 text-lg font-semibold capitalize">{fmtFull(result.startAt)}</div>
            <div className="mt-0.5 text-xs text-white/65">{t.inYourTz(tzShort)}</div>
            <div className="mt-4 border-t border-white/10 pt-4 text-sm">
              {result.mode === "online" ? (
                <span className="inline-flex items-center gap-2 text-white/70"><MeetIcon size={16} /> {t.online} · Google Meet</span>
              ) : (
                <span className="text-white/70">{t.presentialAt(address || t.addressConfirmed)}</span>
              )}
            </div>
          </div>
          {result.mode === "online" && result.meetLink && (
            <div className="px-7">
              <a href={result.meetLink} target="_blank" rel="noreferrer"
                className="block w-full rounded-2xl bg-[#792990] py-3.5 text-center font-semibold text-white shadow-[0_8px_30px_rgba(121,41,144,0.4)] transition hover:brightness-110">
                {t.joinMeet}
              </a>
            </div>
          )}
          <p className="px-7 pt-5 text-center text-sm text-white/70">{t.emailSent}</p>
          <div className="px-7 pb-7 pt-4 text-center">
            <a href={`/book/manage/${result.manageToken}`} className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline">
              {t.rescheduleQ}
            </a>
          </div>
        </div>
      </Page>
    );
  }

  const confirmDisabled = !selected || status === "submitting" || !name.trim() || !email.trim() || !whatsapp.trim();

  // ── Booking ───────────────────────────────────────────────────────────────
  return (
    <Page lang={lang} onLang={setLang}>
      <div style={reveal(0)}><Brand kicker={t.kicker} /></div>

      {/* Hero */}
      <header className="mt-9" style={reveal(1)}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75">
          <span className="h-1.5 w-1.5 rounded-full bg-[#b06fd0]" /> {initial.bookingType.name}
        </span>
        <h1 style={display} className="mt-4 text-[2rem] font-bold leading-[1.1] sm:text-[2.4rem]">
          {initial.lead?.name ? (
            <>{t.greetingName(initial.lead.name.split(" ")[0])}<br /><span className="text-white/85">{t.talkQ}</span></>
          ) : (
            <>{t.noLeadL1}<br /><span className="text-white/85">{t.noLeadL2}</span></>
          )}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
          {t.heroDescPre}<strong className="font-semibold text-white">{t.heroStrongMinutes(initial.bookingType.durationMinutes)}</strong>{t.heroDescPost}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/80">{t.minChip(initial.bookingType.durationMinutes)}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/80"><MeetIcon size={13} /> Google Meet</span>
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/80">{t.confirmChip}</span>
        </div>
      </header>

      {/* Card */}
      <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl sm:p-6" style={reveal(2)}>
        {presentialAvailable && (
          <div className="mb-6">
            <div className="mb-2.5 text-sm font-semibold text-white/85">{t.modeQ}</div>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { m: "online" as const, icon: <MeetIcon size={22} />, tt: t.online, d: t.onlineSub },
                { m: "presential" as const, icon: "📍", tt: t.presential, d: t.presentialSub },
              ]).map((o) => {
                const on = mode === o.m;
                return (
                  <button key={o.m} type="button" aria-pressed={on} onClick={() => setMode(o.m)}
                    className="rounded-2xl border p-3 text-left transition"
                    style={on
                      ? { borderColor: "#b06fd0", background: "rgba(121,41,144,0.30)" }
                      : { borderColor: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.08)" }}>
                    <div className="text-xl">{o.icon}</div>
                    <div className="mt-1 text-sm font-semibold">{o.tt}</div>
                    <div className="text-xs text-white/70">{o.d}</div>
                  </button>
                );
              })}
            </div>
            {mode === "presential" && (
              <div className="mt-3">
                <label className="text-xs font-medium text-white/60">{t.addressLabel}</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]"
                  placeholder={t.addressPh} />
              </div>
            )}
          </div>
        )}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 style={display} className="text-xl font-bold leading-tight text-white">{t.chooseTime}</h2>
            <p className="mt-1 text-xs text-white/55">{t.chooseTimeSub}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70" title={t.tzTitle}>
            🌐 {tzShort}
          </span>
        </div>

        <div className="-mr-1 max-h-[46vh] space-y-6 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {days.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              {t.noSlots1}<br />{t.noSlots2}
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

        {selected && (
          <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
            <div className="text-sm font-semibold text-white/85">{t.yourData}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh}
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t.emailPh}
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-white/45 outline-none transition focus:border-[#792990]/70 focus:bg-white/[0.09]" />
            <PhoneField onChange={setWhatsapp} t={t} />
            <p className="text-[11px] text-white/60">{t.privacy}</p>
          </div>
        )}

        {status === "error" && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-100">{errorMsg}</p>
        )}

        <button type="button" disabled={confirmDisabled} onClick={submit}
          className="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #9d3bc4 0%, #792990 100%)", boxShadow: confirmDisabled ? "none" : "0 12px 36px rgba(121,41,144,0.6)" }}>
          {status === "submitting"
            ? t.confirming
            : selected
              ? <span className="capitalize">{t.confirmPrefix} · {fmtFull(selected)}</span>
              : t.selectTimeCta}
        </button>
      </section>
    </Page>
  );
}

/* WB logo (white) — sits on the dark hero, anchored with a hairline + kicker. */
function Brand({ kicker }: { kicker: string }) {
  return (
    <div className="flex flex-col items-center">
      <a href={WB_SITE} target="_blank" rel="noreferrer" className="transition hover:opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_WB_WHITE} alt="WB Digital Solutions" height={60} style={{ height: 60, width: "auto" }} />
      </a>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="h-px w-7 bg-white/25" />
        <span className="text-[10.5px] font-medium uppercase tracking-[0.32em] text-white/70">{kicker}</span>
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
