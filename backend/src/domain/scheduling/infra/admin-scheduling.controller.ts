import { Controller, Get, Post, Patch, Body, Param, UseGuards, HttpCode, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { CreateBookingTypeUseCase } from "../application/use-cases/create-booking-type.use-case";
import { UpdateBookingTypeUseCase } from "../application/use-cases/update-booking-type.use-case";
import { ListBookingTypesUseCase } from "../application/use-cases/list-booking-types.use-case";
import { GenerateBookingLinkUseCase } from "../application/use-cases/generate-booking-link.use-case";

interface WeeklyWindow { weekday: number; start: string; end: string }
interface PresentialCity { city: string; state?: string }

class CreateBookingTypeDto {
  name!: string;
  weeklyHours!: WeeklyWindow[];
  presentialCities?: PresentialCity[];
  durationMinutes?: number;
  bufferMinutes?: number;
  minNoticeHours?: number;
  maxAdvanceDays?: number;
  timeZone?: string;
  slug?: string;
}
class UpdateBookingTypeDto {
  name?: string;
  weeklyHours?: WeeklyWindow[];
  presentialCities?: PresentialCity[];
  durationMinutes?: number;
  bufferMinutes?: number;
  minNoticeHours?: number;
  maxAdvanceDays?: number;
  timeZone?: string;
  active?: boolean;
}
class GenerateLinkDto {
  bookingTypeId!: string;
  leadId?: string;
  contactId?: string;
  label?: string;
}

@ApiTags("Scheduling (admin)")
@ApiBearerAuth("JWT")
@Controller("scheduling")
@UseGuards(JwtAuthGuard)
export class AdminSchedulingController {
  constructor(
    private readonly createType: CreateBookingTypeUseCase,
    private readonly updateType: UpdateBookingTypeUseCase,
    private readonly listTypes: ListBookingTypesUseCase,
    private readonly genLink: GenerateBookingLinkUseCase,
  ) {}

  @Get("booking-types")
  @ApiOperation({ summary: "Listar tipos de agendamento do usuário" })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const r = await this.listTypes.execute({ ownerId: user.id });
    return (r as { value: unknown }).value;
  }

  @Post("booking-types")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar tipo de agendamento" })
  async create(@Body() body: CreateBookingTypeDto, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.createType.execute({ ...body, ownerId: user.id });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return r.value;
  }

  @Patch("booking-types/:id")
  @ApiOperation({ summary: "Atualizar tipo de agendamento" })
  async update(@Param("id") id: string, @Body() body: UpdateBookingTypeDto, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.updateType.execute({ id, requesterId: user.id, ...body });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return r.value;
  }

  @Post("links")
  @HttpCode(201)
  @ApiOperation({ summary: "Gerar link de agendamento (por lead ou genérico)" })
  async generate(@Body() body: GenerateLinkDto, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.genLink.execute({ ownerId: user.id, bookingTypeId: body.bookingTypeId, leadId: body.leadId, contactId: body.contactId, label: body.label });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return r.value;
  }
}
