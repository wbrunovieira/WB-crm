import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import {
  GetMeetingsUseCase,
  GetMeetingByIdUseCase,
  ScheduleMeetingUseCase,
  UpdateMeetingUseCase,
  CancelMeetingUseCase,
  MeetingNotFoundError,
  MeetingForbiddenError,
} from "../application/use-cases/meetings-crud.use-cases";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

function serialize(m: any) {
  return {
    id: m.id, title: m.title, googleEventId: m.googleEventId, meetLink: m.meetLink,
    startAt: m.startAt, endAt: m.endAt, status: m.status,
    attendeeEmails: (() => { try { return JSON.parse(m.attendeeEmails); } catch { return []; } })(),
    leadId: m.leadId, contactId: m.contactId, organizationId: m.organizationId, dealId: m.dealId,
    ownerId: m.ownerId, createdAt: m.createdAt,
  };
}

function throwIfError(err: Error) {
  if (err instanceof MeetingNotFoundError) throw new NotFoundException(err.message);
  if (err instanceof MeetingForbiddenError) throw new ForbiddenException(err.message);
  throw err;
}

@UseGuards(JwtAuthGuard)
@Controller("meetings")
export class MeetingsCrudController {
  constructor(
    private readonly getMeetings: GetMeetingsUseCase,
    private readonly getMeeting: GetMeetingByIdUseCase,
    private readonly schedule: ScheduleMeetingUseCase,
    private readonly update: UpdateMeetingUseCase,
    private readonly cancel: CancelMeetingUseCase,
  ) {}

  @Get()
  async list(@Request() req: any) {
    const r = await this.getMeetings.execute({ requesterId: req.user.id });
    if (r.isLeft()) throwIfError(r.value);
    return r.unwrap().map(serialize);
  }

  @Get(":id")
  async getOne(@Request() req: any, @Param("id") id: string) {
    const r = await this.getMeeting.execute({ id, requesterId: req.user.id });
    if (r.isLeft()) throwIfError(r.value);
    return serialize(r.unwrap());
  }

  @Post()
  async create(@Request() req: any, @Body() body: {
    title: string; startAt: string; endAt?: string;
    attendeeEmails?: string[]; googleEventId?: string; meetLink?: string;
    leadId?: string; contactId?: string; organizationId?: string; dealId?: string;
  }) {
    const r = await this.schedule.execute({
      title: body.title,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      attendeeEmails: body.attendeeEmails ?? [],
      googleEventId: body.googleEventId,
      meetLink: body.meetLink,
      leadId: body.leadId,
      contactId: body.contactId,
      organizationId: body.organizationId,
      dealId: body.dealId,
      requesterId: req.user.id,
    });
    if (r.isLeft()) throwIfError(r.value);
    return serialize(r.unwrap());
  }

  @Patch(":id")
  async updateOne(@Request() req: any, @Param("id") id: string, @Body() body: {
    title?: string; startAt?: string; endAt?: string; status?: string; attendeeEmails?: string[];
  }) {
    const r = await this.update.execute({
      id, requesterId: req.user.id,
      title: body.title,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      status: body.status,
      attendeeEmails: body.attendeeEmails,
    });
    if (r.isLeft()) throwIfError(r.value);
    return serialize(r.unwrap());
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOne(@Request() req: any, @Param("id") id: string) {
    const r = await this.cancel.execute({ id, requesterId: req.user.id });
    if (r.isLeft()) throwIfError(r.value);
  }
}
