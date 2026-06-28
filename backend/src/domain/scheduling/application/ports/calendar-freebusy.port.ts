import { Interval } from "../../enterprise/services/availability.service";

/** Lê os intervalos ocupados do Google Calendar do dono (freebusy). */
export abstract class CalendarFreeBusyPort {
  abstract getBusy(ownerId: string, from: Date, to: Date): Promise<Interval[]>;
}
