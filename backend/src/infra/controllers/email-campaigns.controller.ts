import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";
import { AddCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/add-campaign-step.use-case";
import { AddRecipientsUseCase } from "@/domain/email-campaigns/application/use-cases/add-recipients.use-case";
import { SendCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/send-campaign-step.use-case";
import { GetCampaignStatsUseCase } from "@/domain/email-campaigns/application/use-cases/get-campaign-stats.use-case";
import { AddToSuppressionUseCase } from "@/domain/email-campaigns/application/use-cases/add-to-suppression.use-case";
import { UnsubscribeRecipientUseCase } from "@/domain/email-campaigns/application/use-cases/unsubscribe-recipient.use-case";
import { EmailCampaignsRepository } from "@/domain/email-campaigns/application/repositories/email-campaigns.repository";
import { EmailSuppressionsRepository } from "@/domain/email-campaigns/application/repositories/email-suppressions.repository";
import { EmailCampaignSendsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-sends.repository";

const TRACKING_BASE_URL = process.env.BACKEND_URL ?? "https://api.crm.wbdigitalsolutions.com";

@ApiTags("email-campaigns")
@Controller("email-campaigns")
export class EmailCampaignsController {
  constructor(
    private readonly createCampaign: CreateEmailCampaignUseCase,
    private readonly addStep: AddCampaignStepUseCase,
    private readonly addRecipients: AddRecipientsUseCase,
    private readonly sendStep: SendCampaignStepUseCase,
    private readonly getStats: GetCampaignStatsUseCase,
    private readonly addSuppression: AddToSuppressionUseCase,
    private readonly unsubscribeRecipient: UnsubscribeRecipientUseCase,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly suppressions: EmailSuppressionsRepository,
    private readonly sends: EmailCampaignSendsRepository,
  ) {}

  // ─── Campaigns ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: "List email campaigns" })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const list = await this.campaigns.findAllByOwner(user.id);
    return list.map((c) => ({
      id: c.id.toString(), name: c.name, description: c.description,
      fromEmail: c.fromEmail, status: c.status, createdAt: c.createdAt,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Create email campaign" })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: { name: string; description?: string; fromEmail: string }) {
    const result = await this.createCampaign.execute({ ...body, ownerId: user.id });
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/stats")
  @ApiOperation({ summary: "Get campaign stats" })
  async stats(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.getStats.execute({ campaignId: id });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete campaign" })
  async deleteCampaign(@Param("id") id: string) {
    await this.campaigns.delete(id);
  }

  // ─── Steps ──────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(":id/steps")
  @HttpCode(201)
  @ApiOperation({ summary: "Add step to campaign" })
  async createStep(
    @Param("id") campaignId: string,
    @Body() body: { order: number; subject: string; bodyHtml: string; delayDays: number },
  ) {
    const result = await this.addStep.execute({ campaignId, ...body });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  // ─── Recipients ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(":id/recipients")
  @HttpCode(201)
  @ApiOperation({ summary: "Add recipients to campaign" })
  async addCampaignRecipients(
    @Param("id") campaignId: string,
    @Body() body: { recipients: { recipientType: "LEAD" | "CONTACT"; recipientId: string; email: string; name?: string; company?: string; role?: string; customVars?: Record<string, string> }[] },
  ) {
    const result = await this.addRecipients.execute({ campaignId, recipients: body.recipients });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  // ─── Send ───────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(":id/send/:stepOrder")
  @HttpCode(200)
  @ApiOperation({ summary: "Send a campaign step (fire-and-forget)" })
  sendCampaignStep(@Param("id") campaignId: string, @Param("stepOrder") stepOrder: string) {
    this.sendStep.execute({ campaignId, stepOrder: parseInt(stepOrder), trackingBaseUrl: TRACKING_BASE_URL })
      .catch((err) => console.error("[email-campaign/send] error:", err));
    return { started: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/start")
  @HttpCode(200)
  @ApiOperation({ summary: "Start campaign (set ACTIVE and send step 0)" })
  async startCampaign(@Param("id") id: string) {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) throw new Error("Campaign not found");
    campaign.start();
    await this.campaigns.save(campaign);
    this.sendStep.execute({ campaignId: id, stepOrder: 0, trackingBaseUrl: TRACKING_BASE_URL })
      .catch((err) => console.error("[email-campaign/start] error:", err));
    return { status: campaign.status };
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/pause")
  @HttpCode(200)
  async pauseCampaign(@Param("id") id: string) {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) throw new Error("Campaign not found");
    campaign.pause();
    await this.campaigns.save(campaign);
    return { status: campaign.status };
  }

  // ─── Suppression ────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get("suppressions")
  @ApiOperation({ summary: "List suppressed emails" })
  async listSuppressions(@CurrentUser() user: AuthenticatedUser) {
    const list = await this.suppressions.findAllByOwner(user.id);
    return list.map((s) => ({ id: s.id.toString(), email: s.email, reason: s.reason, createdAt: s.createdAt }));
  }

  @UseGuards(JwtAuthGuard)
  @Post("suppressions")
  @HttpCode(201)
  @ApiOperation({ summary: "Manually add email to suppression list" })
  async suppress(@CurrentUser() user: AuthenticatedUser, @Body() body: { email: string }) {
    const result = await this.addSuppression.execute({ email: body.email, ownerId: user.id, reason: "manual" });
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Delete("suppressions/:email")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove email from suppression list" })
  async removeSuppression(@CurrentUser() user: AuthenticatedUser, @Param("email") email: string) {
    await this.suppressions.delete(email, user.id);
  }

  // ─── Tracking (public — no auth) ────────────────────────────────────────────

  @Get("tracking/open/:sendId")
  @ApiOperation({ summary: "Track email open (1x1 pixel)" })
  async trackOpen(@Param("sendId") sendId: string, @Res() res: Response) {
    const send = await this.sends.findById(sendId);
    if (send) {
      send.markOpened();
      await this.sends.save(send);
    }
    // Return 1x1 transparent GIF
    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.set({ "Content-Type": "image/gif", "Cache-Control": "no-cache, no-store" });
    res.send(pixel);
  }

  @Get("tracking/click/:sendId")
  @ApiOperation({ summary: "Track link click and redirect" })
  async trackClick(@Param("sendId") sendId: string, @Query("url") url: string, @Res() res: Response) {
    const send = await this.sends.findById(sendId);
    if (send) {
      send.markClicked();
      await this.sends.save(send);
    }
    res.redirect(url || "/");
  }

  @Get("tracking/unsubscribe/:sendId")
  @ApiOperation({ summary: "Unsubscribe recipient" })
  async trackUnsubscribe(@Param("sendId") sendId: string, @Res() res: Response) {
    await this.unsubscribeRecipient.execute({ sendId });
    res.set("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>Você foi descadastrado</h2>
      <p>Seu endereço de email foi removido da lista e não receberá mais mensagens desta campanha.</p>
    </body></html>`);
  }
}
