import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { TrackEmailOpenUseCase } from "../../application/use-cases/track-email-open.use-case";
import { TrackEmailClickUseCase } from "../../application/use-cases/track-email-click.use-case";

// 1x1 transparent GIF pixel (base64 decoded)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

@ApiTags("Email Tracking")
@Controller("track")
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(
    private readonly trackOpen: TrackEmailOpenUseCase,
    private readonly trackClick: TrackEmailClickUseCase,
  ) {}

  @Get("open/:token")
  @HttpCode(200)
  @ApiOperation({ summary: "Email open tracking pixel (public)" })
  async handleOpen(
    @Param("token") token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userAgent = req.headers["user-agent"] ?? "";
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress
      ?? "";

    try {
      const result = await this.trackOpen.execute({ token, userAgent, ip });

      if (result.isLeft()) {
        this.logger.debug("TrackEmailOpen: invalid token", { token, error: result.value.message });
      }
    } catch (err) {
      this.logger.warn("TrackEmailOpen: unexpected error", {
        token,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Always return 1x1 GIF — never expose errors
    res
      .status(200)
      .set({
        "Content-Type": "image/gif",
        "Content-Length": String(TRANSPARENT_GIF.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      })
      .end(TRANSPARENT_GIF);
  }

  @Get("click/:token")
  @ApiOperation({ summary: "Email click tracking redirect (public)" })
  async handleClick(
    @Param("token") token: string,
    @Query("url") url: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userAgent = req.headers["user-agent"] ?? "";
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress
      ?? "";

    // Default fallback URL
    const fallbackUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    if (!url || url.trim().length === 0) {
      res.redirect(302, fallbackUrl);
      return;
    }

    try {
      const result = await this.trackClick.execute({ token, url, userAgent, ip });

      if (result.isRight()) {
        res.redirect(302, result.value.redirectUrl);
        return;
      }

      this.logger.debug("TrackEmailClick: error", { token, error: result.value.message });
    } catch (err) {
      this.logger.warn("TrackEmailClick: unexpected error", {
        token,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Fallback redirect
    res.redirect(302, url || fallbackUrl);
  }
}
