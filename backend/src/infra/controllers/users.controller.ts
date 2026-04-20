import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { GetUsersUseCase } from "@/domain/auth/application/use-cases/get-users.use-case";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly getUsers: GetUsersUseCase) {}

  @Get()
  async list(@Request() req: any) {
    const result = await this.getUsers.execute({
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });
    if (result.isLeft()) throw result.value;
    return result.unwrap().map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  }
}
