import { describe, it, expect } from "vitest";
import { NotificationType } from "@/domain/notifications/enterprise/value-objects/notification-type.vo";

describe("NotificationType", () => {
  it("aceita tipo válido", () => {
    expect(NotificationType.create("GENERIC").isRight()).toBe(true);
    expect(NotificationType.create("LEAD_RESEARCH_COMPLETE").isRight()).toBe(true);
  });

  it("rejeita tipo inválido", () => {
    expect(NotificationType.create("UNKNOWN").isLeft()).toBe(true);
  });

  it("factory generic()", () => {
    expect(NotificationType.generic().value).toBe("GENERIC");
  });
});
