import { Controller, Get, Patch, Body, Query, UseGuards, Request, Sse, MessageEvent } from "@nestjs/common";
import { Observable, Subject, interval, merge } from "rxjs";
import { map, filter, takeUntil } from "rxjs/operators";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import {
  GetNotificationsUseCase,
  MarkNotificationsReadUseCase,
} from "../../application/use-cases/notifications.use-cases";
import { NotificationsEventBus } from "../../application/ports/notifications-event-bus";

function serialize(n: any) {
  return {
    id: n.id.toString(),
    type: n.type,
    status: n.status,
    title: n.title,
    summary: n.summary,
    payload: n.payload ?? null,
    read: n.read,
    userId: n.userId,
    jobId: n.jobId,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly getNotifications: GetNotificationsUseCase,
    private readonly markRead: MarkNotificationsReadUseCase,
    private readonly eventBus: NotificationsEventBus,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @Request() req: any,
    @Query("unread") unread?: string,
    @Query("type") type?: string,
    @Query("limit") limit?: string,
  ) {
    const result = await this.getNotifications.execute({
      requesterId: req.user.id,
      onlyUnread: unread === "true",
      type: type || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    if (result.isLeft()) throw result.value;
    const { notifications, unreadCount } = result.unwrap();
    return { notifications: notifications.map(serialize), unreadCount };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("read")
  async markAsRead(@Request() req: any, @Body() body: { ids?: string[]; all?: boolean }) {
    const result = await this.markRead.execute({
      requesterId: req.user.id,
      ids: body.ids,
      all: body.all,
    });
    if (result.isLeft()) throw result.value;
    return { ok: true };
  }

  @UseGuards(SseJwtAuthGuard)
  @Sse("stream")
  stream(@Request() req: any): Observable<MessageEvent> {
    const userId = req.user.id;
    const destroy$ = new Subject<void>();

    const keepalive$ = interval(25000).pipe(
      map(() => ({ data: JSON.stringify({ type: "keepalive" }) } as MessageEvent)),
    );

    const events$ = this.eventBus.events$.pipe(
      filter((event: any) => event.userId === userId),
      map(event => ({ data: JSON.stringify(serialize(event)) } as MessageEvent)),
    );

    return merge(keepalive$, events$).pipe(takeUntil(destroy$));
  }
}
