import type { EmailCampaignRecipient } from "../../enterprise/entities/email-campaign-recipient.entity";

export class VariableResolverService {
  resolve(template: string, recipient: EmailCampaignRecipient, trackingBaseUrl?: string, sendId?: string): string {
    const firstName = recipient.name?.split(" ")[0] ?? "";
    const saudacao = firstName || recipient.company || "";

    const unsubscribeUrl = trackingBaseUrl && sendId
      ? `${trackingBaseUrl}/tracking/unsubscribe/${sendId}`
      : "";

    const vars: Record<string, string> = {
      nome: recipient.name ?? "",
      name: recipient.name ?? "",
      "primeiro-nome": firstName,
      "first-name": firstName,
      saudacao,
      greeting: saudacao,
      email: recipient.email,
      empresa: recipient.company ?? "",
      company: recipient.company ?? "",
      cargo: recipient.role ?? "",
      role: recipient.role ?? "",
      setor: recipient.customVars?.setor ?? recipient.customVars?.segment ?? "",
      segment: recipient.customVars?.segment ?? recipient.customVars?.setor ?? "",
      link_descadastro: unsubscribeUrl,
      unsubscribe_link: unsubscribeUrl,
      ...recipient.customVars,
    };

    let result = template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
      return vars[key.trim().toLowerCase()] ?? `{{${key}}}`;
    });

    if (trackingBaseUrl && sendId) {
      result = this.rewriteLinks(result, trackingBaseUrl, sendId);
    }

    return result;
  }

  private rewriteLinks(html: string, baseUrl: string, sendId: string): string {
    return html.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (_, url: string) => `href="${baseUrl}/tracking/click/${sendId}?url=${encodeURIComponent(url)}"`,
    );
  }

  injectTrackingPixel(html: string, baseUrl: string, sendId: string): string {
    const pixel = `<img src="${baseUrl}/tracking/open/${sendId}" width="1" height="1" style="display:none" alt="" />`;
    return html.includes("</body>") ? html.replace("</body>", `${pixel}</body>`) : html + pixel;
  }
}
