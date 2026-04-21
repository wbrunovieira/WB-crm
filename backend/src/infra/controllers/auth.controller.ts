import {
  Body, Controller, Get, HttpCode, Post, Query, Redirect,
  UnauthorizedException, ForbiddenException, ConflictException, BadRequestException, UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiResponse, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { google } from "googleapis";
import { LoginUseCase } from "@/domain/auth/application/use-cases/login.use-case";
import { RegisterUserUseCase, UserAlreadyExistsError } from "@/domain/auth/application/use-cases/register-user.use-case";
import {
  StoreGoogleTokensUseCase,
  DisconnectGoogleUseCase,
  StoreGoToTokensUseCase,
} from "@/domain/auth/application/use-cases/oauth.use-cases";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";

class LoginDto {
  @ApiProperty({ example: "admin@example.com" })
  email!: string;

  @ApiProperty({ example: "senha123" })
  password!: string;
}

class LoginResponseDto {
  @ApiProperty({ description: "JWT Bearer token para usar em todas as requisições autenticadas" })
  accessToken!: string;
}

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

const GOTO_AUTH_URL = "https://authentication.logmeininc.com/oauth/authorize";
const GOTO_TOKEN_URL = "https://authentication.logmeininc.com/oauth/token";
const GOTO_SCOPES = "call-events.v1.notifications.manage call-events.v1.events.read cr.v1.read";

function createGoogleClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function frontendUrl() {
  return process.env.FRONTEND_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly register: RegisterUserUseCase,
    private readonly storeGoogleTokens: StoreGoogleTokensUseCase,
    private readonly disconnectGoogle: DisconnectGoogleUseCase,
    private readonly storeGoToTokens: StoreGoToTokensUseCase,
  ) {}

  @Post("register")
  @HttpCode(201)
  @ApiOperation({ summary: "Registrar novo usuário" })
  async doRegister(@Body() body: { name: string; email: string; password: string }) {
    if (!body.name || !body.email || !body.password) {
      throw new BadRequestException("name, email e password são obrigatórios");
    }
    if (body.password.length < 6) throw new BadRequestException("Senha deve ter no mínimo 6 caracteres");
    const result = await this.register.execute(body);
    if (result.isLeft()) {
      if (result.value instanceof UserAlreadyExistsError) throw new ConflictException(result.value.message);
      throw new BadRequestException(result.value.message);
    }
    return { user: result.value };
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Autenticar usuário e obter JWT" })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: "Credenciais inválidas" })
  async doLogin(@Body() body: LoginDto): Promise<LoginResponseDto> {
    const result = await this.login.execute({ email: body.email, password: body.password });
    if (result.isLeft()) throw new UnauthorizedException(result.value.message);
    return result.value;
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  @Get("google")
  @Redirect()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Iniciar fluxo OAuth Google — redireciona para consentimento" })
  googleAuth(@CurrentUser() user: AuthenticatedUser) {
    if (user.role !== "admin") throw new ForbiddenException("Apenas admins podem conectar conta Google");
    const url = createGoogleClient().generateAuthUrl({ access_type: "offline", scope: GOOGLE_SCOPES, prompt: "consent" });
    return { url, statusCode: 302 };
  }

  @Get("google/callback")
  @Redirect()
  @ApiOperation({ summary: "Callback OAuth Google — troca code por tokens e salva" })
  async googleCallback(@Query("code") code: string, @Query("error") error: string) {
    const base = frontendUrl();
    if (error) return { url: `${base}/admin/google?error=consent_denied`, statusCode: 302 };
    if (!code) return { url: `${base}/admin/google?error=no_code`, statusCode: 302 };
    try {
      const client = createGoogleClient();
      const { tokens } = await client.getToken(code);
      client.setCredentials({ access_token: tokens.access_token! });
      const oauth2Api = google.oauth2({ version: "v2", auth: client });
      const { data } = await oauth2Api.userinfo.get();
      await this.storeGoogleTokens.execute({
        email: data.email ?? "",
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        scope: tokens.scope ?? GOOGLE_SCOPES.join(" "),
      });
      return { url: `${base}/admin/google?success=true`, statusCode: 302 };
    } catch {
      return { url: `${base}/admin/google?error=token_exchange`, statusCode: 302 };
    }
  }

  @Post("google/disconnect")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Desconectar conta Google — remove tokens" })
  async googleDisconnect(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.disconnectGoogle.execute({ requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) throw new ForbiddenException(result.value.message);
  }

  // ── GoTo OAuth ───────────────────────────────────────────────────────────────

  @Get("goto")
  @Redirect()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Iniciar fluxo OAuth GoTo — redireciona para consentimento" })
  gotoAuth(@CurrentUser() user: AuthenticatedUser) {
    if (user.role !== "admin") throw new ForbiddenException("Apenas admins podem conectar conta GoTo");
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3010";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.GOTO_CLIENT_ID ?? "",
      redirect_uri: `${backendUrl}/auth/goto/callback`,
      scope: GOTO_SCOPES,
    });
    return { url: `${GOTO_AUTH_URL}?${params}`, statusCode: 302 };
  }

  @Get("goto/callback")
  @Redirect()
  @ApiOperation({ summary: "Callback OAuth GoTo — troca code por tokens e persiste" })
  async gotoCallback(@Query("code") code: string, @Query("error") error: string) {
    const base = frontendUrl();
    if (error) return { url: `${base}/dashboard/admin?goto_error=${encodeURIComponent(error)}`, statusCode: 302 };
    if (!code) return { url: `${base}/dashboard/admin?goto_error=no_code`, statusCode: 302 };
    try {
      const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3010";
      const clientId = process.env.GOTO_CLIENT_ID ?? "";
      const clientSecret = process.env.GOTO_CLIENT_SECRET ?? "";
      const redirectUri = `${backendUrl}/auth/goto/callback`;
      const res = await fetch(GOTO_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      });
      if (!res.ok) throw new Error(`Token exchange: ${res.status}`);
      const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };
      await this.storeGoToTokens.execute({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      });
      return { url: `${base}/dashboard/admin?goto_connected=1`, statusCode: 302 };
    } catch {
      return { url: `${base}/dashboard/admin?goto_error=token_exchange_failed`, statusCode: 302 };
    }
  }
}
