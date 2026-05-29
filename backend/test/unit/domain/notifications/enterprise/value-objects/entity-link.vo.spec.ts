import { describe, it, expect } from "vitest";
import { EntityLink, InvalidEntityLinkError } from "@/domain/notifications/enterprise/value-objects/entity-link.vo";

describe("EntityLink (Value Object)", () => {
  describe("create", () => {
    it("builds the lead route", () => {
      const r = EntityLink.create("lead", "lead-123");
      expect(r.isRight()).toBe(true);
      expect(r.value).toBeInstanceOf(EntityLink);
      expect((r.value as EntityLink).value).toBe("/leads/lead-123");
    });

    it("builds the organization route", () => {
      const r = EntityLink.create("organization", "org-9");
      expect((r.value as EntityLink).value).toBe("/organizations/org-9");
    });

    it("builds the contact route", () => {
      const r = EntityLink.create("contact", "c-1");
      expect((r.value as EntityLink).value).toBe("/contacts/c-1");
    });

    it("builds the partner route", () => {
      const r = EntityLink.create("partner", "p-1");
      expect((r.value as EntityLink).value).toBe("/partners/p-1");
    });

    it("trims the id", () => {
      const r = EntityLink.create("lead", "  lead-x  ");
      expect((r.value as EntityLink).value).toBe("/leads/lead-x");
    });

    it("rejects an empty id", () => {
      const r = EntityLink.create("lead", "   ");
      expect(r.isLeft()).toBe(true);
      expect(r.value).toBeInstanceOf(InvalidEntityLinkError);
    });

    it("rejects an unsupported type", () => {
      const r = EntityLink.create("deal" as never, "d-1");
      expect(r.isLeft()).toBe(true);
      expect(r.value).toBeInstanceOf(InvalidEntityLinkError);
    });
  });

  describe("firstOf — picks the first ref with a valid id (priority order)", () => {
    it("returns the first non-empty ref in order", () => {
      const link = EntityLink.firstOf([
        { type: "lead", id: undefined },
        { type: "organization", id: "org-7" },
        { type: "contact", id: "c-7" },
      ]);
      expect(link?.value).toBe("/organizations/org-7");
    });

    it("respects priority when multiple ids are present", () => {
      const link = EntityLink.firstOf([
        { type: "lead", id: "lead-1" },
        { type: "contact", id: "c-1" },
      ]);
      expect(link?.value).toBe("/leads/lead-1");
    });

    it("skips empty/whitespace ids", () => {
      const link = EntityLink.firstOf([
        { type: "lead", id: "  " },
        { type: "contact", id: "c-2" },
      ]);
      expect(link?.value).toBe("/contacts/c-2");
    });

    it("returns null when no ref has a valid id", () => {
      const link = EntityLink.firstOf([
        { type: "lead", id: null },
        { type: "contact", id: undefined },
      ]);
      expect(link).toBeNull();
    });
  });
});
