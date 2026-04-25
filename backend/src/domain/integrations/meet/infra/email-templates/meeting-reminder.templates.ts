import { BrandConfig, getBrandConfig } from "./brand.config";

export type ReminderType = "morning_reminder" | "one_hour_reminder" | "on_time_reminder";

export interface ReminderEmailParams {
  organizerEmail: string;
  meetingTitle: string;
  meetingStartAt: Date;
  meetingEndAt: Date;
  meetLink?: string;
  contactName?: string;
  companyName?: string;
}

function fmt(d: Date): string {
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtTime(d: Date): string {
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit",
  });
}

function logoHtml(brand: BrandConfig): string {
  return brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.logoAlt}" style="height:36px;max-width:180px;object-fit:contain;" />`
    : `<span style="font-size:18px;font-weight:bold;color:${brand.textColor};">${brand.companyName}</span>`;
}

function meetButtonHtml(brand: BrandConfig, meetLink: string, label: string): string {
  return `
    <div style="margin:24px 0;text-align:center;">
      <a href="${meetLink}" style="background:${brand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
        🎥 ${label}
      </a>
      <p style="margin:8px 0 0;color:${brand.mutedColor};font-size:12px;">${meetLink}</p>
    </div>`;
}

function detailsTable(brand: BrandConfig, title: string, startAt: Date, endAt: Date): string {
  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;background:${brand.surfaceColor};border-radius:8px;border:1px solid ${brand.borderColor};margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid ${brand.borderColor};">
          <span style="color:${brand.mutedColor};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">📋 Pauta</span><br>
          <strong style="color:${brand.textColor};font-size:15px;">${title}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid ${brand.borderColor};">
          <span style="color:${brand.mutedColor};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">🗓️ Início</span><br>
          <span style="color:${brand.textColor};font-size:14px;">${fmt(startAt)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <span style="color:${brand.mutedColor};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">⏱️ Término previsto</span><br>
          <span style="color:${brand.textColor};font-size:14px;">${fmt(endAt)}</span>
        </td>
      </tr>
    </table>`;
}

function wrapper(brand: BrandConfig, headerHtml: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${brand.bgColor};border-radius:12px;overflow:hidden;font-family:${brand.font};">
        <tr>
          <td style="background:${brand.headerBackground};padding:20px 32px;">
            ${logoHtml(brand)}
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:${brand.textColor};">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:${brand.surfaceColor};border-top:1px solid ${brand.borderColor};padding:14px 32px;text-align:center;">
            <span style="color:${brand.mutedColor};font-size:12px;">${brand.companyName || headerHtml} · Qualquer dúvida, responda este e-mail.</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildMorningReminderEmail(params: ReminderEmailParams): { subject: string; html: string } {
  const brand = getBrandConfig(params.organizerEmail ?? "");
  const greeting = params.contactName ? `Bom dia, ${params.contactName}!` : "Bom dia!";
  const company = params.companyName ? ` da <strong>${params.companyName}</strong>` : "";

  const body = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${greeting} ☀️</p>
    <p style="margin:0 0 24px;font-size:15px;color:${brand.mutedColor};">
      Só passando para lembrar que hoje${company ? ` a gente tem uma reunião com a <strong>${params.companyName}</strong>` : " temos uma reunião agendada"}. Estamos animados! 😊
    </p>
    ${detailsTable(brand, params.meetingTitle, params.meetingStartAt, params.meetingEndAt)}
    ${params.meetLink ? meetButtonHtml(brand, params.meetLink, "Acessar link da reunião") : ""}
    <p style="color:${brand.mutedColor};font-size:13px;margin:0 0 24px;">
      Até mais tarde!
    </p>
    <p style="margin:0;color:${brand.textColor};font-size:14px;">Até logo,<br><strong>${params.organizerEmail}</strong></p>
  `;

  return {
    subject: `Lembrete: ${params.meetingTitle} — hoje às ${fmtTime(params.meetingStartAt)}`,
    html: wrapper(brand, brand.companyName, body),
  };
}

export function buildOneHourReminderEmail(params: ReminderEmailParams): { subject: string; html: string } {
  const brand = getBrandConfig(params.organizerEmail ?? "");
  const greeting = params.contactName ? `Olá, ${params.contactName}!` : "Olá!";

  const body = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${greeting} ⏰</p>
    <p style="margin:0 0 24px;font-size:15px;color:${brand.mutedColor};">
      Falta <strong style="color:${brand.textColor};">1 hora</strong> para a sua reunião começar. Veja os detalhes abaixo:
    </p>
    ${detailsTable(brand, params.meetingTitle, params.meetingStartAt, params.meetingEndAt)}
    ${params.meetLink ? meetButtonHtml(brand, params.meetLink, "Entrar no Google Meet") : ""}
    <p style="margin:0;color:${brand.textColor};font-size:14px;">Até já,<br><strong>${params.organizerEmail}</strong></p>
  `;

  return {
    subject: `Falta 1 hora — ${params.meetingTitle}`,
    html: wrapper(brand, brand.companyName, body),
  };
}

export function buildOnTimeReminderEmail(params: ReminderEmailParams): { subject: string; html: string } {
  const brand = getBrandConfig(params.organizerEmail ?? "");
  const greeting = params.contactName ? `${params.contactName}, é agora!` : "É agora!";

  const body = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${greeting} 🚀</p>
    <p style="margin:0 0 24px;font-size:15px;color:${brand.mutedColor};">
      Sua reunião <strong style="color:${brand.textColor};">${params.meetingTitle}</strong> está começando agora. Estamos te esperando!
    </p>
    ${params.meetLink
      ? `<div style="margin:24px 0;text-align:center;">
          <a href="${params.meetLink}" style="background:${brand.primaryColor};color:#ffffff;padding:16px 40px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;letter-spacing:0.3px;">
            🎥 Entrar agora no Google Meet
          </a>
          <p style="margin:10px 0 0;color:${brand.mutedColor};font-size:12px;">${params.meetLink}</p>
        </div>`
      : `<p style="color:${brand.mutedColor};font-size:14px;">Verifique o convite no Google Agenda para acessar o link da reunião.</p>`
    }
    <p style="margin:0;color:${brand.textColor};font-size:14px;">Te vejo lá,<br><strong>${params.organizerEmail}</strong></p>
  `;

  return {
    subject: `🚀 Sua reunião começa agora — ${params.meetingTitle}`,
    html: wrapper(brand, brand.companyName, body),
  };
}

export function buildReminderEmail(type: ReminderType, params: ReminderEmailParams): { subject: string; html: string } {
  switch (type) {
    case "morning_reminder": return buildMorningReminderEmail(params);
    case "one_hour_reminder": return buildOneHourReminderEmail(params);
    case "on_time_reminder":  return buildOnTimeReminderEmail(params);
  }
}
