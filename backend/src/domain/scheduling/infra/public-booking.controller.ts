import { Controller, Get, Post, Param, Body, HttpCode, NotFoundException, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { GetAvailableSlotsUseCase } from "../application/use-cases/get-available-slots.use-case";
import { CreateBookingUseCase } from "../application/use-cases/create-booking.use-case";
import { RescheduleBookingUseCase } from "../application/use-cases/reschedule-booking.use-case";
import { CancelBookingUseCase } from "../application/use-cases/cancel-booking.use-case";

class CreateBookingDto {
  startISO!: string;
  mode!: "online" | "presential";
  attendeeName?: string;
  attendeeEmail?: string;
}
class RescheduleDto { startISO!: string; }

/**
 * Página pública de agendamento (sem login) — servida sob agenda.wbdigitalsolutions.com.
 * O token do link identifica o lead (atribuição automática no CRM).
 */
@ApiTags("Scheduling (public)")
@Controller("public/booking")
export class PublicBookingController {
  constructor(
    private readonly getSlots: GetAvailableSlotsUseCase,
    private readonly create: CreateBookingUseCase,
    private readonly reschedule: RescheduleBookingUseCase,
    private readonly cancel: CancelBookingUseCase,
  ) {}

  @Get(":token")
  @HttpCode(200)
  @ApiOperation({ summary: "Horários livres + dados do agendamento (público)" })
  @ApiParam({ name: "token" })
  async slots(@Param("token") token: string) {
    const r = await this.getSlots.execute({ token });
    if (r.isLeft()) throw new NotFoundException(r.value.message);
    return r.value;
  }

  @Post(":token")
  @HttpCode(201)
  @ApiOperation({ summary: "Agendar reunião (público)" })
  @ApiParam({ name: "token" })
  async book(@Param("token") token: string, @Body() body: CreateBookingDto) {
    const r = await this.create.execute({
      token, startISO: body.startISO, mode: body.mode,
      attendeeName: body.attendeeName, attendeeEmail: body.attendeeEmail,
    });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return r.value;
  }

  @Post("manage/:manageToken/reschedule")
  @HttpCode(200)
  @ApiOperation({ summary: "Remarcar (público, via manageToken)" })
  @ApiParam({ name: "manageToken" })
  async doReschedule(@Param("manageToken") manageToken: string, @Body() body: RescheduleDto) {
    const r = await this.reschedule.execute({ manageToken, startISO: body.startISO });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return r.value;
  }

  @Post("manage/:manageToken/cancel")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancelar (público, via manageToken)" })
  @ApiParam({ name: "manageToken" })
  async doCancel(@Param("manageToken") manageToken: string) {
    const r = await this.cancel.execute({ manageToken });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return r.value;
  }
}
