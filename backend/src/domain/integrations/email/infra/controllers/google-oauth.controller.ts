import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  Logger,
  ForbiddenException,
  HttpCode,
} from "@nestjs/common";
import type { Response } from "express";
import { google } from "googleapis";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { SaveGoogleTokenUseCase, DeleteGoogleTokenUseCase } from "../../application/use-cases/google-token.use-cases";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

@ApiTags("Google OAuth")
@Controller("google")
export class GoogleOAuthController {
  private readonly logger = new Logger(GoogleOAuthController.name);

  constructor(
    private readonly saveToken: SaveGoogleTokenUseCase,
    private readonly deleteToken: DeleteGoogleTokenUseCase,
  ) {}

  /** Inicia o fluxo OAuth. Aceita ?token= (JWT) para autenticação via redirect. */
  @Get("auth")
  @UseGuards(SseJwtAuthGuard)
  @ApiOperation({ summary: "Initiate Google OAuth flow" })
  initiateOAuth(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    if (user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Apenas administradores podem conectar a conta Google");
    }

    const client = createOAuth2Client();
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    return res.redirect(url);
  }

  /** Callback do Google OAuth — recebe o code, troca por tokens, salva e redireciona */
  @Get("callback")
  @ApiOperation({ summary: "Handle Google OAuth callback" })
  async handleCallback(
    @Query("code") code: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    const base = frontendUrl();

    if (error) {
      this.logger.warn("Usuário recusou consentimento Google", { error });
      return res.redirect(`${base}/admin/google?error=consent_denied`);
    }

    if (!code) {
      return res.redirect(`${base}/admin/google?error=no_code`);
    }

    try {
      const client = createOAuth2Client();
      const { tokens } = await client.getToken(code);

      // Fetch email via userinfo
      client.setCredentials({ access_token: tokens.access_token! });
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const { data } = await oauth2.userinfo.get();
      const email = data.email ?? "";

      await this.saveToken.execute({
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        scope: tokens.scope ?? SCOPES.join(" "),
        email,
      });

      this.logger.log("Conta Google conectada", { email });
      return res.redirect(`${base}/admin/google?success=true`);
    } catch (err) {
      this.logger.error("Falha ao conectar conta Google", {
        error: err instanceof Error ? err.message : String(err),
      });
      return res.redirect(`${base}/admin/google?error=token_exchange`);
    }
  }

  /** Desconecta a conta Google (exclui o token salvo) */
  @Post("disconnect")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Disconnect Google account" })
  async disconnect(@CurrentUser() user: AuthenticatedUser) {
    if (user.role?.toLowerCase() !== "admin") {
      throw new ForbiddenException("Apenas administradores podem desconectar a conta Google");
    }
    await this.deleteToken.execute();
    this.logger.log("Conta Google desconectada");
    return { success: true };
  }
}
