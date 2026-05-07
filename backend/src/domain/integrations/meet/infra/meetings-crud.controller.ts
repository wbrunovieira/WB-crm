import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus, UploadedFile, UseInterceptors, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
import { PurgeCompletedMeetingUseCase } from "../application/use-cases/purge-completed-meeting.use-case";
import { SchedulePresentialMeetingUseCase } from "../application/use-cases/schedule-presential-meeting.use-case";
import { UploadPresentialRecordingUseCase } from "../application/use-cases/upload-presential-recording.use-case";
import { MeetingsRepository } from "../application/repositories/meetings.repository";

function serialize(m: any) {
  return {
    id: m.id, title: m.title, googleEventId: m.googleEventId, meetLink: m.meetLink,
    startAt: m.startAt, endAt: m.endAt, actualStartAt: m.actualStartAt, actualEndAt: m.actualEndAt,
    status: m.status,
    attendeeEmails: m.attendeeEmails,
    organizerEmail: m.organizerEmail ?? null,
    recordingDriveId: m.recordingDriveId, recordingUrl: m.recordingUrl,
    uploadedAudioKey: m.uploadedAudioKey ?? null,
    transcriptText: m.transcriptText, nativeTranscriptUrl: m.nativeTranscriptUrl,
    meetingSummary: m.meetingSummary, activityId: m.activityId,
    leadId: m.leadId, contactId: m.contactId, organizationId: m.organizationId, dealId: m.dealId,
    ownerId: m.ownerId,
    isPresential: m.isPresential ?? false,
    location: m.location ?? null,
    confirmationMethod: m.confirmationMethod ?? null,
    confirmationSentAt: m.confirmationSentAt ?? null,
    createdAt: m.createdAt, updatedAt: m.updatedAt,
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
    private readonly purge: PurgeCompletedMeetingUseCase,
    private readonly schedulePresential: SchedulePresentialMeetingUseCase,
    private readonly uploadRecording: UploadPresentialRecordingUseCase,
    private readonly meetingsRepo: MeetingsRepository,
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
    attendeeEmails?: string[];
    organizerEmail?: string;
    description?: string;
    contactName?: string;
    companyName?: string;
    leadId?: string; contactId?: string; organizationId?: string; dealId?: string;
    createActivity?: boolean; skipCalendar?: boolean;
  }) {
    const r = await this.schedule.execute({
      title: body.title,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      attendeeEmails: body.attendeeEmails ?? [],
      organizerEmail: body.organizerEmail,
      description: body.description,
      contactName: body.contactName,
      companyName: body.companyName,
      leadId: body.leadId,
      contactId: body.contactId,
      organizationId: body.organizationId,
      dealId: body.dealId,
      requesterId: req.user.id,
      createActivity: body.createActivity,
      skipCalendar: body.skipCalendar,
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

  @Delete(":id/purge")
  @HttpCode(HttpStatus.NO_CONTENT)
  async purgeOne(@Request() req: any, @Param("id") id: string) {
    const r = await this.purge.execute({
      id,
      requesterId: req.user.id,
      isAdmin: req.user.role === "admin",
    });
    if (r.isLeft()) throwIfError(r.value);
  }

  @Post("presential")
  async createPresential(@Request() req: any, @Body() body: {
    title: string;
    startAt: string;
    endAt?: string;
    attendeeEmails?: string[];
    location?: string;
    confirmationMethod?: "email" | "whatsapp" | "none";
    confirmationPhone?: string;
    leadId?: string;
    contactId?: string;
    organizationId?: string;
    dealId?: string;
    description?: string;
    reminderSteps?: ("immediate" | "morning_reminder" | "one_hour_reminder" | "on_time_reminder")[];
    reminderChannels?: ("email" | "whatsapp")[];
    attendeeEmail?: string;
    attendeePhone?: string;
    contactName?: string;
    companyName?: string;
  }) {
    const r = await this.schedulePresential.execute({
      title: body.title,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      attendeeEmails: body.attendeeEmails ?? [],
      requesterId: req.user.id,
      isPresential: true,
      location: body.location,
      confirmationMethod: body.confirmationMethod,
      confirmationPhone: body.confirmationPhone,
      leadId: body.leadId,
      contactId: body.contactId,
      organizationId: body.organizationId,
      dealId: body.dealId,
      description: body.description,
      reminderSteps: body.reminderSteps,
      reminderChannels: body.reminderChannels,
      attendeeEmail: body.attendeeEmail,
      attendeePhone: body.attendeePhone,
      contactName: body.contactName,
      companyName: body.companyName,
    });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return serialize(r.value);
  }

  @Patch(":id/end")
  @HttpCode(HttpStatus.NO_CONTENT)
  async endMeeting(@Request() req: any, @Param("id") id: string) {
    const meeting = await this.meetingsRepo.findById(id);
    if (!meeting) throw new NotFoundException("Reunião não encontrada");
    if (meeting.ownerId !== req.user.id && req.user.role !== "admin") {
      throw new ForbiddenException("Sem permissão para encerrar esta reunião");
    }
    await this.meetingsRepo.markAsEnded(id, { actualEndAt: new Date() });
  }

  @Post(":id/upload-recording")
  @UseInterceptors(FileInterceptor("file"))
  async uploadPresentialRecording(
    @Request() req: any,
    @Param("id") id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    if (!file) throw new BadRequestException("Arquivo obrigatório");
    const r = await this.uploadRecording.execute({
      meetingId: id,
      buffer: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
      requesterId: req.user.id,
    });
    if (r.isLeft()) throw new BadRequestException(r.value.message);
    return r.value;
  }
}
