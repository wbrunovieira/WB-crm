export interface BookingLead {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
}

/** Dados mínimos do lead necessários para o agendamento. */
export abstract class SchedulingLeadsPort {
  abstract findForBooking(leadId: string): Promise<BookingLead | null>;
}
