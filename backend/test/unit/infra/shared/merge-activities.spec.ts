import { describe, it, expect } from "vitest";
import { mergeActivities } from "@/infra/shared/timeline/merge-activities";

const a = (id: string, iso: string) => ({ id, createdAt: new Date(iso), subject: id });

describe("mergeActivities (roll-up de timeline)", () => {
  it("mescla diretas + as dos contatos, ordena por createdAt desc", () => {
    const direct = [a("d1", "2026-07-03T00:00:00Z"), a("d2", "2026-07-01T00:00:00Z")];
    const viaContacts = [a("c1", "2026-07-02T00:00:00Z")];
    const out = mergeActivities(direct, viaContacts);
    expect(out.map((x) => x.id)).toEqual(["d1", "c1", "d2"]);
  });

  it("deduplica por id (atividade que já é direta não entra de novo)", () => {
    const direct = [a("x1", "2026-07-01T00:00:00Z")];
    const viaContacts = [a("x1", "2026-07-01T00:00:00Z"), a("c1", "2026-07-02T00:00:00Z")];
    const out = mergeActivities(direct, viaContacts);
    expect(out.map((x) => x.id)).toEqual(["c1", "x1"]);
  });

  it("respeita o limite (top N por data)", () => {
    const direct = [a("d1", "2026-07-05T00:00:00Z"), a("d2", "2026-07-04T00:00:00Z")];
    const viaContacts = [a("c1", "2026-07-03T00:00:00Z")];
    const out = mergeActivities(direct, viaContacts, 2);
    expect(out.map((x) => x.id)).toEqual(["d1", "d2"]);
  });
});
