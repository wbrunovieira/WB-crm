import { describe, it, expect } from "vitest";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";

const makeContact = (overrides = {}) =>
  Contact.create({ ownerId: "owner-1", name: "João Silva", ...overrides });

describe("Contact entity", () => {
  it("cria contato com status 'active' por padrão", () => {
    const c = makeContact();
    expect(c.status).toBe("active");
    expect(c.isPrimary).toBe(false);
    expect(c.preferredLanguage).toBe("pt-BR");
    expect(c.whatsappVerified).toBe(false);
  });

  it("toggleStatus alterna active → inactive", () => {
    const c = makeContact({ status: "active" });
    c.toggleStatus();
    expect(c.status).toBe("inactive");
  });

  it("toggleStatus alterna inactive → active", () => {
    const c = makeContact({ status: "inactive" });
    c.toggleStatus();
    expect(c.status).toBe("active");
  });

  it("activate define status como active", () => {
    const c = makeContact({ status: "inactive" });
    c.activate();
    expect(c.status).toBe("active");
  });

  it("deactivate define status como inactive", () => {
    const c = makeContact({ status: "active" });
    c.deactivate();
    expect(c.status).toBe("inactive");
  });

  it("update altera campos e toca updatedAt", () => {
    const c = makeContact();
    const before = c.updatedAt;
    c.update({ name: "Novo Nome", email: "novo@email.com" });
    expect(c.name).toBe("Novo Nome");
    expect(c.email).toBe("novo@email.com");
    expect(c.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
