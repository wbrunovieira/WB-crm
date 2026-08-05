import { Controller, Get, NotFoundException, Param, StreamableFile, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { GetLeadGooglePhotoUseCase } from "@/domain/leads/application/use-cases/get-lead-google-photo.use-case";

// Separate controller (same "leads" path prefix as LeadsController) — <img> tags can't send
// custom headers, so this route needs SseJwtAuthGuard's ?token= query param support instead of
// the class-level JwtAuthGuard on LeadsController. Same pattern as ActivityPhotoController.
@ApiTags("Leads")
@ApiBearerAuth()
@UseGuards(SseJwtAuthGuard)
@Controller("leads")
export class LeadGooglePhotoController {
  constructor(private readonly getGooglePhoto: GetLeadGooglePhotoUseCase) {}

  @Get(":id/google-photo")
  async streamPhoto(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser): Promise<StreamableFile> {
    const result = await this.getGooglePhoto.execute({
      leadId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) throw new NotFoundException(result.value.message);

    return new StreamableFile(result.value.photo, { type: "image/jpeg", disposition: "inline" });
  }
}
