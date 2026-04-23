import { describe, it, expect } from "vitest";
import { Reflector } from "@nestjs/core";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { NotificationsController } from "@/domain/notifications/infra/controllers/notifications.controller";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";

function getMethodGuards(target: object, method: string): Function[] {
  return Reflect.getMetadata(GUARDS_METADATA, (target as any).prototype[method]) ?? [];
}

function getClassGuards(target: Function): Function[] {
  return Reflect.getMetadata(GUARDS_METADATA, target) ?? [];
}

describe("NotificationsController guard configuration", () => {
  it("class-level guard should NOT be JwtAuthGuard (SSE would be blocked)", () => {
    const classGuards = getClassGuards(NotificationsController);
    expect(classGuards).not.toContain(JwtAuthGuard);
  });

  it("list() uses JwtAuthGuard", () => {
    const guards = getMethodGuards(NotificationsController, "list");
    expect(guards).toContain(JwtAuthGuard);
  });

  it("markAsRead() uses JwtAuthGuard", () => {
    const guards = getMethodGuards(NotificationsController, "markAsRead");
    expect(guards).toContain(JwtAuthGuard);
  });

  it("stream() uses SseJwtAuthGuard only — not JwtAuthGuard", () => {
    const guards = getMethodGuards(NotificationsController, "stream");
    expect(guards).toContain(SseJwtAuthGuard);
    expect(guards).not.toContain(JwtAuthGuard);
  });
});
