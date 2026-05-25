import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { CreateBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/create-bot-flow.use-case";
import { SaveBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/save-bot-flow.use-case";
import { GetBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/get-bot-flow.use-case";
import { ListBotFlowsUseCase } from "@/domain/bot-flows/application/use-cases/list-bot-flows.use-case";
import { DeleteBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/delete-bot-flow.use-case";
import { ToggleBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/toggle-bot-flow.use-case";
import { BotFlow } from "@/domain/bot-flows/enterprise/entities/bot-flow.entity";

function serialize(flow: BotFlow) {
  return {
    id: flow.id.toString(),
    ownerId: flow.ownerId,
    instanceName: flow.instanceName,
    name: flow.name,
    description: flow.description,
    isActive: flow.isActive,
    triggerType: flow.triggerType,
    triggerValue: flow.triggerValue,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
    nodes: flow.nodes.map((n) => ({
      id: n.id.toString(),
      nodeType: n.nodeType,
      posX: n.posX,
      posY: n.posY,
      config: n.config,
    })),
    edges: flow.edges.map((e) => ({
      id: e.id.toString(),
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      conditionType: e.conditionType,
      conditionValue: e.conditionValue,
      label: e.label,
    })),
  };
}

@ApiTags("bot-flows")
@Controller("bot-flows")
@UseGuards(JwtAuthGuard)
export class BotFlowsController {
  constructor(
    private readonly createUseCase: CreateBotFlowUseCase,
    private readonly saveUseCase: SaveBotFlowUseCase,
    private readonly getUseCase: GetBotFlowUseCase,
    private readonly listUseCase: ListBotFlowsUseCase,
    private readonly deleteUseCase: DeleteBotFlowUseCase,
    private readonly toggleUseCase: ToggleBotFlowUseCase,
  ) {}

  @Get()
  async listFlows(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.listUseCase.execute(user.id);
    return (result.value as any).flows.map(serialize);
  }

  @Post()
  @HttpCode(201)
  async createFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { instanceName: string; name: string; description?: string; triggerType?: string; triggerValue?: string },
  ) {
    const result = await this.createUseCase.execute({ ownerId: user.id, ...body } as any);
    return serialize((result.value as any).flow);
  }

  @Get(":id")
  async getFlow(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.getUseCase.execute({ id, ownerId: user.id });
    if (result.isLeft()) throw new Error(result.value.message);
    return serialize(result.value);
  }

  @Put(":id/flow")
  @HttpCode(200)
  async saveFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: { nodes: any[]; edges: any[]; name?: string; description?: string; triggerType?: string; triggerValue?: string },
  ) {
    const result = await this.saveUseCase.execute({ flowId: id, ownerId: user.id, ...body });
    if (result.isLeft()) throw new Error(result.value.message);
    return { ok: true };
  }

  @Post(":id/toggle")
  @HttpCode(200)
  async toggleFlow(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.toggleUseCase.execute({ id, ownerId: user.id });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteFlow(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const result = await this.deleteUseCase.execute({ id, ownerId: user.id });
    if (result.isLeft()) throw new Error(result.value.message);
  }
}
