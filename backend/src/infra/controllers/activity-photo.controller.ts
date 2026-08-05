import { Controller, Get, NotFoundException, Param, StreamableFile, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { GetActivityPhotoKeyUseCase } from "@/domain/activities/application/use-cases/get-activity-photo-key.use-case";
import { ActivityPhotoStoragePort } from "@/domain/activities/application/ports/activity-photo-storage.port";

// Separate controller (same "activities" path prefix as ActivitiesController) because the
// standard JwtAuthGuard only reads the Authorization header — <img> tags can't send custom
// headers, so this route needs SseJwtAuthGuard's ?token= query param support instead. Same
// pattern as GoToRecordingsController for MP3 playback.
@ApiTags("Activities")
@ApiBearerAuth()
@UseGuards(SseJwtAuthGuard)
@Controller("activities")
export class ActivityPhotoController {
  constructor(
    private readonly getPhotoKey: GetActivityPhotoKeyUseCase,
    private readonly storage: ActivityPhotoStoragePort,
  ) {}

  @Get(":id/photo")
  async streamPhoto(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<StreamableFile> {
    const result = await this.getPhotoKey.execute({
      activityId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) throw new NotFoundException(result.value.message);

    const buffer = await this.storage.download(result.value.photoKey);
    return new StreamableFile(buffer, { type: "image/jpeg", disposition: "inline" });
  }
}
