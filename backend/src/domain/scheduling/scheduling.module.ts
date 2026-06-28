import { Module } from "@nestjs/common";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { MeetModule } from "@/domain/integrations/meet/meet.module";
import { LeadsModule } from "@/domain/leads/leads.module";

import { BookingTypesRepository } from "./application/repositories/booking-types.repository";
import { BookingLinksRepository } from "./application/repositories/booking-links.repository";
import { CalendarFreeBusyPort } from "./application/ports/calendar-freebusy.port";
import { SchedulingLeadsPort } from "./application/ports/scheduling-leads.port";
import { MeetingSchedulerPort } from "./application/ports/meeting-scheduler.port";
import { TokenGeneratorPort } from "./application/ports/token-generator.port";

import { GetAvailableSlotsUseCase } from "./application/use-cases/get-available-slots.use-case";
import { CreateBookingUseCase } from "./application/use-cases/create-booking.use-case";
import { RescheduleBookingUseCase } from "./application/use-cases/reschedule-booking.use-case";
import { CancelBookingUseCase } from "./application/use-cases/cancel-booking.use-case";

import { PrismaBookingTypesRepository } from "./infra/prisma/prisma-booking-types.repository";
import { PrismaBookingLinksRepository } from "./infra/prisma/prisma-booking-links.repository";
import { GoogleFreeBusyAdapter } from "./infra/google-freebusy.adapter";
import { SchedulingLeadsAdapter } from "./infra/scheduling-leads.adapter";
import { MeetSchedulerAdapter } from "./infra/meet-scheduler.adapter";
import { CryptoTokenGenerator } from "./infra/crypto-token-generator";
import { PublicBookingController } from "./infra/public-booking.controller";

@Module({
  imports: [SharedInfraModule, MeetModule, LeadsModule],
  controllers: [PublicBookingController],
  providers: [
    GetAvailableSlotsUseCase,
    CreateBookingUseCase,
    RescheduleBookingUseCase,
    CancelBookingUseCase,
    { provide: BookingTypesRepository, useClass: PrismaBookingTypesRepository },
    { provide: BookingLinksRepository, useClass: PrismaBookingLinksRepository },
    { provide: CalendarFreeBusyPort, useClass: GoogleFreeBusyAdapter },
    { provide: SchedulingLeadsPort, useClass: SchedulingLeadsAdapter },
    { provide: MeetingSchedulerPort, useClass: MeetSchedulerAdapter },
    { provide: TokenGeneratorPort, useClass: CryptoTokenGenerator },
  ],
})
export class SchedulingModule {}
