import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "@/infra/database/prisma.service";
import { ProcessCallRecordingUseCase } from "@/domain/integrations/goto/application/use-cases/process-call-recording.use-case";
import { PollCallTranscriptionsUseCase } from "@/domain/integrations/goto/application/use-cases/poll-call-transcriptions.use-case";

@Injectable()
export class GoToRecordingCronService {
  private readonly logger = new Logger(GoToRecordingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processRecording: ProcessCallRecordingUseCase,
    private readonly pollTranscriptions: PollCallTranscriptionsUseCase,
  ) {}

  @Cron("*/15 * * * *")
  async processRecordings(): Promise<void> {
    this.logger.log("GoTo recording cron: starting");

    const now = new Date();
    const since4h = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    try {
      // Pass 1: Find activities with recording ID but no S3 key yet
      const pendingDownload = await this.prisma.activity.findMany({
        where: {
          gotoRecordingId: { not: null },
          gotoRecordingUrl: null,
          completedAt: { gte: since4h },
        },
        select: { id: true },
      });

      this.logger.log(`GoTo recording cron: ${pendingDownload.length} activities need S3 download`);

      for (const activity of pendingDownload) {
        try {
          await this.processRecording.execute({ activityId: activity.id });
        } catch (err) {
          this.logger.error(`Error processing recording for activity ${activity.id}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Pass 2: Poll pending transcription jobs
      const pendingJobs = await this.prisma.activity.findMany({
        where: {
          gotoTranscriptText: null,
          OR: [
            { gotoTranscriptionJobId: { not: null } },
            { gotoTranscriptionJobId2: { not: null } },
          ],
        },
        select: { id: true },
      });

      this.logger.log(`GoTo recording cron: ${pendingJobs.length} activities have pending transcription jobs`);

      for (const activity of pendingJobs) {
        try {
          await this.pollTranscriptions.execute({ activityId: activity.id });
        } catch (err) {
          this.logger.error(`Error polling transcription for activity ${activity.id}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      this.logger.error("GoTo recording cron: fatal error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.logger.log("GoTo recording cron: done");
  }
}
