export interface BookingLead {
  id: string;
  name: string;
  email: string | null; // do lead OU do contato principal (resolvido)
  city: string | null;
  state: string | null;
  address: string | null;
}

/** Resolução de lead para o agendamento (por id, por contato, ou criação). */
export abstract class SchedulingLeadsPort {
  abstract findForBooking(leadId: string): Promise<BookingLead | null>;
  /** Resolve um partner para o agendamento (nome/e-mail/endereço próprios do partner). */
  abstract findPartnerForBooking(partnerId: string): Promise<BookingLead | null>;
  /** Procura um lead do dono por e-mail ou WhatsApp (para o link genérico). */
  abstract findByContact(input: { ownerId: string; email?: string; whatsapp?: string }): Promise<BookingLead | null>;
  /** Cria um lead inbound a partir do auto-agendamento. */
  abstract createLead(input: { ownerId: string; name: string; email?: string; whatsapp?: string }): Promise<BookingLead>;
  /** Salva o e-mail confirmado no lead se ele ainda não tinha e-mail próprio. */
  abstract confirmLeadEmail(leadId: string, email: string): Promise<void>;
  /** Salva o WhatsApp informado no lead se ele ainda não tinha. */
  abstract confirmLeadWhatsapp(leadId: string, whatsapp: string): Promise<void>;
}
