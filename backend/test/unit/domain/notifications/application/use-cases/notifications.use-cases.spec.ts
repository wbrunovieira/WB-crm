import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryNotificationsRepository } from "../../fakes/in-memory-notifications.repository";
import {
  GetNotificationsUseCase,
  CreateNotificationUseCase,
  MarkNotificationsReadUseCase,
} from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { Notification } from "@/domain/notifications/enterprise/entities/notification";

let repo: InMemoryNotificationsRepository;
const seed = (overrides: Partial<Parameters<typeof Notification.create>[0]> = {}) =>
  Notification.create({ type: "GENERIC", title: "T", summary: "s", userId: "u1", ...overrides }).unwrap();

beforeEach(() => { repo = new InMemoryNotificationsRepository(); });

describe("GetNotificationsUseCase", () => {
  it("retorna lista vazia", async () => {
    const r = (await new GetNotificationsUseCase(repo).execute({ requesterId: "u1" })).unwrap();
    expect(r.notifications).toHaveLength(0);
    expect(r.unreadCount).toBe(0);
  });

  it("retorna notificações do usuário", async () => {
    await repo.save(seed({ userId: "u1" }));
    await repo.save(seed({ userId: "u2" }));
    const r = (await new GetNotificationsUseCase(repo).execute({ requesterId: "u1" })).unwrap();
    expect(r.notifications).toHaveLength(1);
  });

  it("filtra apenas não lidas com onlyUnread", async () => {
    const n = seed();
    n.markAsRead();
    await repo.save(n);
    await repo.save(seed());
    const r = (await new GetNotificationsUseCase(repo).execute({ requesterId: "u1", onlyUnread: true })).unwrap();
    expect(r.notifications).toHaveLength(1);
    expect(r.unreadCount).toBe(1);
  });
});

describe("CreateNotificationUseCase", () => {
  it("cria e persiste notificação", async () => {
    const r = await new CreateNotificationUseCase(repo).execute({
      type: "LEAD_RESEARCH_COMPLETE",
      title: "Pesquisa concluída",
      summary: "Lead X pesquisado com sucesso",
      userId: "u1",
    });
    expect(r.isRight()).toBe(true);
    expect(repo.notifications).toHaveLength(1);
    expect(repo.notifications[0].type).toBe("LEAD_RESEARCH_COMPLETE");
  });

  it("retorna erro com tipo inválido", async () => {
    const r = await new CreateNotificationUseCase(repo).execute({
      type: "INVALIDO",
      title: "T",
      summary: "s",
      userId: "u1",
    });
    expect(r.isLeft()).toBe(true);
  });
});

describe("MarkNotificationsReadUseCase", () => {
  it("marca IDs específicos como lidos", async () => {
    const n1 = seed();
    const n2 = seed();
    await repo.save(n1);
    await repo.save(n2);

    await new MarkNotificationsReadUseCase(repo).execute({ requesterId: "u1", ids: [n1.id.toString()] });
    expect(repo.notifications.find(n => n.id.equals(n1.id))!.read).toBe(true);
    expect(repo.notifications.find(n => n.id.equals(n2.id))!.read).toBe(false);
  });

  it("marca todas as notificações como lidas", async () => {
    await repo.save(seed());
    await repo.save(seed());
    await new MarkNotificationsReadUseCase(repo).execute({ requesterId: "u1", all: true });
    expect(repo.notifications.every(n => n.read)).toBe(true);
  });

  it("não afeta notificações de outro usuário", async () => {
    const n = seed({ userId: "u2" });
    await repo.save(n);
    await new MarkNotificationsReadUseCase(repo).execute({ requesterId: "u1", all: true });
    expect(n.read).toBe(false);
  });
});
