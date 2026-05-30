import { describe, it, expect } from "vitest";
import { ActivitySubject } from "@/domain/activities/enterprise/value-objects/activity-subject.vo";

describe("ActivitySubject VO", () => {
  it("aceita e faz trim", () => {
    const r = ActivitySubject.create("  Ligar para cliente  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("Ligar para cliente");
  });
  it("rejeita vazio com a mensagem de domínio", () => {
    const r = ActivitySubject.create("   ");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toBe("Assunto da atividade é obrigatório");
  });
  it("rejeita null/undefined", () => {
    expect(ActivitySubject.create(null).isLeft()).toBe(true);
    expect(ActivitySubject.create(undefined).isLeft()).toBe(true);
  });
});
