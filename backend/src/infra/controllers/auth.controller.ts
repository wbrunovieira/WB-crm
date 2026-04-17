import { Body, Controller, HttpCode, Post, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LoginUseCase } from "@/domain/auth/application/use-cases/login.use-case";

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

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly login: LoginUseCase) {}

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
}
