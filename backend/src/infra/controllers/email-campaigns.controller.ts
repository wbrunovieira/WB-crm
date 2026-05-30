import * as path from "path";
import * as fs from "fs";
import { Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";
import { AddCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/add-campaign-step.use-case";
import { AddRecipientsUseCase } from "@/domain/email-campaigns/application/use-cases/add-recipients.use-case";
import { BulkEnrollUseCase } from "@/domain/email-campaigns/application/use-cases/bulk-enroll.use-case";
import { EnrollEntityUseCase } from "@/domain/email-campaigns/application/use-cases/enroll-entity.use-case";
import { SendCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/send-campaign-step.use-case";
import { GetCampaignStatsUseCase } from "@/domain/email-campaigns/application/use-cases/get-campaign-stats.use-case";
import { AddToSuppressionUseCase } from "@/domain/email-campaigns/application/use-cases/add-to-suppression.use-case";
import { UnsubscribeRecipientUseCase } from "@/domain/email-campaigns/application/use-cases/unsubscribe-recipient.use-case";
import { HandleGmailBounceUseCase } from "@/domain/email-campaigns/application/use-cases/handle-gmail-bounce.use-case";
import { TriggerCampaignSendNowUseCase, sendingInProgress } from "@/domain/email-campaigns/application/use-cases/trigger-campaign-send-now.use-case";
import { GetCampaignProgressUseCase } from "@/domain/email-campaigns/application/use-cases/get-campaign-progress.use-case";
import { ClearCampaignRecipientsUseCase } from "@/domain/email-campaigns/application/use-cases/clear-campaign-recipients.use-case";
import { GetCampaignSourceGroupsUseCase, SearchEnrollableRecipientsUseCase, ListSuppressionsWithNamesUseCase } from "@/domain/email-campaigns/application/use-cases/campaign-recipient-queries.use-cases";
import { EmailCampaignsRepository } from "@/domain/email-campaigns/application/repositories/email-campaigns.repository";
import { EmailSuppressionsRepository } from "@/domain/email-campaigns/application/repositories/email-suppressions.repository";
import { EmailCampaignSendsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-sends.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

const TRACKING_BASE_URL = process.env.BACKEND_URL ?? "https://api.crm.wbdigitalsolutions.com";

@ApiTags("email-campaigns")
@Controller("email-campaigns")
export class EmailCampaignsController {
  constructor(
    private readonly createCampaign: CreateEmailCampaignUseCase,
    private readonly addStep: AddCampaignStepUseCase,
    private readonly addRecipients: AddRecipientsUseCase,
    private readonly bulkEnroll: BulkEnrollUseCase,
    private readonly enrollEntity: EnrollEntityUseCase,
    private readonly sendStep: SendCampaignStepUseCase,
    private readonly getStats: GetCampaignStatsUseCase,
    private readonly addSuppression: AddToSuppressionUseCase,
    private readonly unsubscribeRecipient: UnsubscribeRecipientUseCase,
    private readonly handleBounce: HandleGmailBounceUseCase,
    private readonly triggerSendNow: TriggerCampaignSendNowUseCase,
    private readonly getProgress: GetCampaignProgressUseCase,
    private readonly clearRecipients: ClearCampaignRecipientsUseCase,
    private readonly getSourceGroups: GetCampaignSourceGroupsUseCase,
    private readonly searchRecipientsUC: SearchEnrollableRecipientsUseCase,
    private readonly listSuppressionsUC: ListSuppressionsWithNamesUseCase,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly suppressions: EmailSuppressionsRepository,
    private readonly sends: EmailCampaignSendsRepository,
    private readonly activitiesRepo: ActivitiesRepository,
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
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: { name: string; description?: string; fromEmail?: string }) {
    const fromEmail = body.fromEmail ?? "bruno@wbdigitalsolutions.com";
    const result = await this.createCampaign.execute({ ...body, fromEmail, ownerId: user.id });
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

  // ─── Bulk enroll ────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(":id/enroll")
  @HttpCode(200)
  @ApiOperation({ summary: "Bulk enroll recipients (all or by sourceGroup)" })
  async enrollRecipients(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") campaignId: string,
    @Body() body: { mode: "all" | "sourceGroup"; sourceGroup?: string },
  ) {
    const result = await this.bulkEnroll.execute({ campaignId, ownerId: user.id, ...body });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/recipients")
  @HttpCode(200)
  @ApiOperation({ summary: "Remove all recipients from a campaign (only allowed when not ACTIVE)" })
  async clearCampaignRecipients(@CurrentUser() user: AuthenticatedUser, @Param("id") campaignId: string) {
    const result = await this.clearRecipients.execute({ campaignId, ownerId: user.id });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  // ─── Send Now & Progress ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(":id/send-now")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Trigger immediate send for all steps of a campaign (fire-and-forget, 202)" })
  async sendNow(@Param("id") id: string) {
    if (sendingInProgress.has(id)) {
      throw new ConflictException("Campaign send already in progress");
    }

    // Auto-activate if DRAFT so send-now works without requiring manual start
    const campaign = await this.campaigns.findById(id);
    if (!campaign) throw new NotFoundException("Campaign not found");
    if (campaign.status === "DRAFT" || campaign.status === "PAUSED") {
      campaign.start();
      await this.campaigns.save(campaign);
    }

    // Fire-and-forget: do not await
    this.triggerSendNow.execute({ campaignId: id })
      .catch((err) => console.error("[email-campaign/send-now] error:", err));

    return {
      triggered: true,
      message: "Envio iniciado em background. Acompanhe o progresso.",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/progress")
  @ApiOperation({ summary: "Get per-recipient send progress for a campaign" })
  async progress(@Param("id") id: string) {
    const result = await this.getProgress.execute({ campaignId: id });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  // ─── Templates ──────────────────────────────────────────────────────────────

  private get templatesDir(): string {
    // Works both in dev (src/) and prod (dist/) because nest-cli copies assets
    const srcDir = path.join(process.cwd(), "src/domain/email-campaigns/templates/campaigns");
    const distDir = path.join(process.cwd(), "dist/domain/email-campaigns/templates/campaigns");
    return fs.existsSync(srcDir) ? srcDir : distDir;
  }

  private templateLabel(filename: string): string {
    // "2026-05-26-ia-amplifica-vs-substitui.html" → "IA Amplifica vs Substitui — 26 Mai 2026"
    const base = filename.replace(".html", "");
    const dateMatch = base.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
    if (!dateMatch) return base;
    const [, year, month, day, slug] = dateMatch;
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const label = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${label} — ${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  }

  @UseGuards(JwtAuthGuard)
  @Get("templates")
  @ApiOperation({ summary: "List available HTML email templates" })
  listTemplates() {
    const dir = this.templatesDir;
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => ({ name: f.replace(".html", ""), label: this.templateLabel(f) }))
      .sort((a, b) => b.name.localeCompare(a.name));
  }

  @UseGuards(JwtAuthGuard)
  @Get("templates/:name")
  @ApiOperation({ summary: "Get HTML template content" })
  getTemplate(@Param("name") name: string) {
    const safe = path.basename(name.replace(/\//g, "")) + ".html";
    const filePath = path.join(this.templatesDir, safe);
    if (!fs.existsSync(filePath)) throw new Error("Template not found");
    return { content: fs.readFileSync(filePath, "utf8") };
  }

  // ─── Source groups & recipient search ───────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get("source-groups")
  @ApiOperation({ summary: "List distinct sourceGroups for the current user" })
  async listSourceGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.getSourceGroups.execute(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("recipient-search")
  @ApiOperation({ summary: "Search leads/orgs as enrollable entities (returns email count + preview)" })
  async searchRecipients(@CurrentUser() user: AuthenticatedUser, @Query("q") q: string) {
    return this.searchRecipientsUC.execute({ ownerId: user.id, query: q });
  }

  // ─── Enroll entity (lead or organization) ───────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(":id/enroll-entity")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Enroll all emails of a lead or organization into a campaign" })
  async enrollEntityHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: { entityType: "lead" | "organization"; entityId: string },
  ) {
    const result = await this.enrollEntity.execute({
      campaignId: id,
      entityType: body.entityType,
      entityId: body.entityId,
      ownerId: user.id,
    });
    if (result.isLeft()) throw new NotFoundException(result.value.message);
    return result.value;
  }

  // ─── Suppression ────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get("suppressions")
  @ApiOperation({ summary: "List suppressed emails with lead/contact name" })
  async listSuppressions(@CurrentUser() user: AuthenticatedUser) {
    return this.listSuppressionsUC.execute(user.id);
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

  // ─── Webhooks (public — secret-validated) ───────────────────────────────────

  @Post("webhooks/bounce")
  @HttpCode(200)
  @ApiOperation({ summary: "Receive Gmail bounce notification (Pub/Sub or direct)" })
  async handleGmailBounce(@Query("secret") secret: string, @Body() body: any) {
    if (secret !== process.env.GMAIL_WEBHOOK_SECRET) return { ok: false };

    // Accepts Google Pub/Sub format: { message: { data: base64(...) } }
    // OR direct format: { email, ownerId }
    let email: string | undefined;
    let ownerId: string | undefined;

    if (body?.message?.data) {
      try {
        const decoded = JSON.parse(Buffer.from(body.message.data, "base64").toString("utf8"));
        email = decoded.email;
        ownerId = decoded.ownerId;
      } catch {
        return { ok: false, error: "invalid_payload" };
      }
    } else {
      email = body?.email;
      ownerId = body?.ownerId;
    }

    if (!email || !ownerId) return { ok: false, error: "missing_fields" };

    await this.handleBounce.execute({ email, ownerId });
    return { ok: true };
  }

  // ─── Tracking (public — no auth) ────────────────────────────────────────────

  @Get("tracking/open/:sendId")
  @ApiOperation({ summary: "Track email open (1x1 pixel)" })
  async trackOpen(@Param("sendId") sendId: string, @Res() res: Response) {
    const send = await this.sends.findById(sendId);
    if (send) {
      send.markOpened();
      await this.sends.save(send);
      // Sync stats to linked Activity
      const activity = await this.activitiesRepo.findByCampaignSendId(sendId);
      if (activity) {
        activity.update({
          emailOpenCount: send.openCount,
          emailOpenedAt: activity.emailOpenedAt ?? send.openedAt,
          emailLastOpenedAt: send.openedAt,
        });
        await this.activitiesRepo.save(activity);
      }
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
      send.markClicked(url || undefined);
      await this.sends.save(send);
      // Sync stats to linked Activity
      const activity = await this.activitiesRepo.findByCampaignSendId(sendId);
      if (activity) {
        const totalClicks = Object.values(send.clickData).reduce((sum, c) => sum + c, 0);
        activity.update({
          emailLinkClickCount: totalClicks,
          emailLinkClickedAt: activity.emailLinkClickedAt ?? send.clickedAt,
          emailLastLinkClickedAt: send.clickedAt,
        });
        await this.activitiesRepo.save(activity);
      }
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
