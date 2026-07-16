import { BrandConfig } from "@/domain/integrations/meet/application/helpers/brand-email.helper";

export type BookingLang = "pt" | "en" | "es" | "it";
const LOCALE: Record<BookingLang, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", it: "it-IT" };

interface Dict {
  subject: (title: string) => string;
  greeting: (name: string) => string;
  confirmed: string;
  intro: string;
  agenda: string;
  when: string;
  ends: string;
  joinNote: string;
  joinBtn: string;
  locationLabel: string;
  googleNote: string;
  signoff: string;
  footer: string;
}

const DICT: Record<BookingLang, Dict> = {
  pt: {
    subject: (t) => `Reunião confirmada: ${t}`,
    greeting: (n) => (n ? `Olá, ${n}!` : "Olá!"),
    confirmed: "Sua reunião está confirmada! ✅",
    intro: "Obrigado pelo seu tempo. Estamos animados para a nossa conversa!",
    agenda: "Pauta",
    when: "Data e hora",
    ends: "Previsão de término",
    joinNote: "No horário combinado, clique no botão abaixo para entrar na videochamada:",
    joinBtn: "🎥 Entrar no Google Meet",
    locationLabel: "📍 Local da reunião",
    googleNote: "Enviamos também um convite pelo Google Agenda para o seu e-mail — responda com Aceitar ou Recusar.",
    signoff: "Até breve,",
    footer: "Qualquer dúvida, responda este e-mail.",
  },
  en: {
    subject: (t) => `Meeting confirmed: ${t}`,
    greeting: (n) => (n ? `Hi, ${n}!` : "Hi!"),
    confirmed: "Your meeting is confirmed! ✅",
    intro: "Thanks for your time. We're looking forward to our conversation!",
    agenda: "Agenda",
    when: "Date and time",
    ends: "Estimated end",
    joinNote: "At the scheduled time, click the button below to join the video call:",
    joinBtn: "🎥 Join Google Meet",
    locationLabel: "📍 Meeting location",
    googleNote: "We've also sent a Google Calendar invite to your email — reply with Accept or Decline.",
    signoff: "See you soon,",
    footer: "Any questions, just reply to this email.",
  },
  es: {
    subject: (t) => `Reunión confirmada: ${t}`,
    greeting: (n) => (n ? `¡Hola, ${n}!` : "¡Hola!"),
    confirmed: "¡Tu reunión está confirmada! ✅",
    intro: "Gracias por tu tiempo. ¡Tenemos muchas ganas de nuestra conversación!",
    agenda: "Tema",
    when: "Fecha y hora",
    ends: "Fin estimado",
    joinNote: "A la hora acordada, haz clic en el botón para entrar a la videollamada:",
    joinBtn: "🎥 Unirse a Google Meet",
    locationLabel: "📍 Lugar de la reunión",
    googleNote: "También te enviamos una invitación de Google Calendar a tu correo — responde con Aceptar o Rechazar.",
    signoff: "¡Hasta pronto!",
    footer: "Cualquier duda, responde a este correo.",
  },
  it: {
    subject: (t) => `Riunione confermata: ${t}`,
    greeting: (n) => (n ? `Ciao, ${n}!` : "Ciao!"),
    confirmed: "La tua riunione è confermata! ✅",
    intro: "Grazie per il tuo tempo. Non vediamo l'ora di parlarti!",
    agenda: "Argomento",
    when: "Data e ora",
    ends: "Fine prevista",
    joinNote: "All'orario stabilito, clicca il pulsante qui sotto per entrare nella videochiamata:",
    joinBtn: "🎥 Entra su Google Meet",
    locationLabel: "📍 Luogo della riunione",
    googleNote: "Ti abbiamo inviato anche un invito di Google Calendar via email — rispondi con Accetta o Rifiuta.",
    signoff: "A presto,",
    footer: "Per qualsiasi domanda, rispondi a questa email.",
  },
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function bookingConfirmationSubject(lang: BookingLang, title: string): string {
  const l = (lang in DICT ? lang : "pt") as BookingLang;
  return DICT[l].subject(title).replace(/[\r\n]+/g, " ").trim();
}

/** Beautiful, branded, i18n confirmation email for the lead who booked via /book. */
export function buildBookingConfirmationEmail(params: {
  lang: BookingLang;
  brand: BrandConfig;
  attendeeName: string;
  title: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  meetLink?: string | null;
  location?: string | null;
}): string {
  const { brand, attendeeName, title, startAt, endAt, timeZone, meetLink, location } = params;
  const lang = (params.lang in DICT ? params.lang : "pt") as BookingLang;
  const t = DICT[lang];
  const locale = LOCALE[lang];

  const fmt = (d: Date) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone, weekday: "long", day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(d);
    } catch {
      return d.toISOString();
    }
  };

  const logoHtml = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${esc(brand.logoAlt)}" style="height:40px;max-width:200px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:bold;color:${brand.textColor};">${esc(brand.companyName || brand.logoAlt)}</span>`;

  const actionHtml = meetLink
    ? `<div style="margin:24px 0;text-align:center;">
        <p style="color:${brand.textColor};font-size:14px;margin:0 0 12px;">${t.joinNote}</p>
        <a href="${esc(meetLink)}" style="background:${brand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">${t.joinBtn}</a>
        <p style="margin:10px 0 0;color:${brand.mutedColor};font-size:12px;">${esc(meetLink)}</p>
       </div>`
    : location
      ? `<div style="background:${brand.surfaceColor};border:1px solid ${brand.borderColor};border-radius:8px;padding:16px;margin:24px 0;">
          <p style="margin:0 0 6px;color:${brand.textColor};font-size:13px;font-weight:bold;">${t.locationLabel}</p>
          <p style="margin:0;color:${brand.mutedColor};font-size:14px;">${esc(location)}</p>
         </div>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${brand.bgColor};border-radius:12px;overflow:hidden;font-family:${brand.font};">
        <tr><td style="background:${brand.headerBackground};padding:24px 32px;">${logoHtml}</td></tr>
        <tr>
          <td style="padding:32px;color:${brand.textColor};">
            <p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${esc(t.greeting(attendeeName))}</p>
            <p style="margin:0 0 24px;font-size:15px;color:${brand.mutedColor};">${t.intro}</p>
            <p style="margin:0 0 16px;font-size:15px;font-weight:bold;">${t.confirmed}</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;background:${brand.surfaceColor};border-radius:8px;border:1px solid ${brand.borderColor};margin-bottom:24px;">
              <tr><td style="padding:12px 16px;border-bottom:1px solid ${brand.borderColor};">
                <span style="color:${brand.mutedColor};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">📋 ${t.agenda}</span><br>
                <strong style="color:${brand.textColor};font-size:15px;">${esc(title)}</strong>
              </td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid ${brand.borderColor};">
                <span style="color:${brand.mutedColor};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">🗓️ ${t.when}</span><br>
                <span style="color:${brand.textColor};font-size:14px;">${esc(fmt(startAt))}</span>
              </td></tr>
              <tr><td style="padding:12px 16px;">
                <span style="color:${brand.mutedColor};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">⏱️ ${t.ends}</span><br>
                <span style="color:${brand.textColor};font-size:14px;">${esc(fmt(endAt))}</span>
              </td></tr>
            </table>
            ${actionHtml}
            <div style="background:${brand.surfaceColor};border:1px solid ${brand.borderColor};border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;color:${brand.mutedColor};font-size:13px;">📩 ${t.googleNote}</p>
            </div>
            <p style="margin:0 0 4px;color:${brand.textColor};font-size:14px;">${t.signoff}</p>
            <p style="margin:0;color:${brand.textColor};font-size:14px;font-weight:bold;">${esc(brand.companyName)}</p>
          </td>
        </tr>
        <tr><td style="background:${brand.surfaceColor};border-top:1px solid ${brand.borderColor};padding:16px 32px;text-align:center;">
          <span style="color:${brand.mutedColor};font-size:12px;">${esc(brand.companyName)} · ${t.footer}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
