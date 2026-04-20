import { describe, it, expect } from "vitest";
import { Notification } from "@/domain/notifications/enterprise/entities/notification";

describe("Notification.create", () => {
  it("cria notificação válida", () => {
    const r = Notification.create({ type: "GENERIC", title: "Teste", summary: "resumo", userId: "u1" });
    expect(r.isRight()).toBe(true);
    const n = r.unwrap();
    expect(n.title).toBe("Teste");
    expect(n.read).toBe(false);
    expect(n.status).toBe("pending");
  });

  it("rejeita title vazio", () => {
    expect(Notification.create({ type: "GENERIC", title: "  ", summary: "s", userId: "u1" }).isLeft()).toBe(true);
  });

  it("rejeita tipo inválido", () => {
    expect(Notification.create({ type: "INVALID", title: "T", summary: "s", userId: "u1" }).isLeft()).toBe(true);
  });

  it("markAsRead muda read para true", () => {
    const n = Notification.create({ type: "GENERIC", title: "T", summary: "s", userId: "u1" }).unwrap();
    n.markAsRead();
    expect(n.read).toBe(true);
  });
});
