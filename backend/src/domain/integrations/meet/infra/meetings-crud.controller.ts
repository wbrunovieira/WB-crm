import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import {
  GetMeetingsUseCase,
  GetMeetingByIdUseCase,
  ScheduleMeetingUseCase,
  UpdateMeetingUseCase,
  CancelMeetingUseCase,
  CheckMeetingTitleUseCase,
  UpdateMeetingSummaryUseCase,
  MeetingNotFoundError,
  MeetingForbiddenError,
} from "../application/use-cases/meetings-crud.use-cases";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

function serialize(m: any) {
  return {
    id: m.id, title: m.title, googleEventId: m.googleEventId, meetLink: m.meetLink,
    startAt: m.startAt, endAt: m.endAt, actualStartAt: m.actualStartAt, actualEndAt: m.actualEndAt,
    status: m.status,
    attendeeEmails: m.attendeeEmails,
    recordingDriveId: m.recordingDriveId, recordingUrl: m.recordingUrl,
    transcriptText: m.transcriptText, nativeTranscriptUrl: m.nativeTranscriptUrl,
    meetingSummary: m.meetingSummary, activityId: m.activityId,
    leadId: m.leadId, contactId: m.contactId, organizationId: m.organizationId, dealId: m.dealId,
    ownerId: m.ownerId, createdAt: m.createdAt, updatedAt: m.updatedAt,
    activity: m.activity ?? null,
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
    private readonly checkTitle: CheckMeetingTitleUseCase,
    private readonly updateSummary: UpdateMeetingSummaryUseCase,
  ) {}

  @Get()
  async list(
    @Request() req: any,
    @Query("leadId") leadId?: string,
    @Query("dealId") dealId?: string,
    @Query("organizationId") organizationId?: string,
    @Query("contactId") contactId?: string,
  ) {
    const r = await this.getMeetings.execute({ requesterId: req.user.id, filters: { leadId, dealId, organizationId, contactId } });
    if (r.isLeft()) throwIfError(r.value);
    return r.unwrap().map(serialize);
  }

  @Get("check-title")
  async checkTitleExists(
    @Request() req: any,
    @Query("title") title: string,
    @Query("excludeId") excludeId?: string,
  ) {
    const r = await this.checkTitle.execute({ requesterId: req.user.id, title, excludeId });
    if (r.isLeft()) throwIfError(r.value);
    return r.unwrap();
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

  @Patch(":id/summary")
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateSummaryPatch(@Request() req: any, @Param("id") id: string, @Body() body: { summary: string | null }) {
    const r = await this.updateSummary.execute({ id, requesterId: req.user.id, summary: body.summary });
    if (r.isLeft()) throwIfError(r.value);
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

  @Patch(":id/cancel")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelPatch(@Request() req: any, @Param("id") id: string) {
    const r = await this.cancel.execute({ id, requesterId: req.user.id });
    if (r.isLeft()) throwIfError(r.value);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOne(@Request() req: any, @Param("id") id: string) {
    const r = await this.cancel.execute({ id, requesterId: req.user.id });
    if (r.isLeft()) throwIfError(r.value);
  }
}
