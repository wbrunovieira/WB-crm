import { describe, it, expect } from "vitest";
import { ICP } from "@/domain/icp/enterprise/entities/icp";

describe("ICP entity", () => {
  it("creates valid ICP", () => {
    const result = ICP.create({ name: "Startup de Tech", slug: "startup-de-tech", content: "Descrição completa", ownerId: "user-001" });
    expect(result.isRight()).toBe(true);
    const icp = result.unwrap();
    expect(icp.name).toBe("Startup de Tech");
    expect(icp.statusValue).toBe("draft");
  });

  it("rejects empty name", () => {
    const result = ICP.create({ name: "  ", slug: "x", content: "c", ownerId: "u1" });
    expect(result.isLeft()).toBe(true);
  });

  it("rejects invalid slug", () => {
    const result = ICP.create({ name: "Test", slug: "INVALID SLUG", content: "c", ownerId: "u1" });
    expect(result.isLeft()).toBe(true);
  });

  it("rejects empty content", () => {
    const result = ICP.create({ name: "Test", slug: "test", content: "", ownerId: "u1" });
    expect(result.isLeft()).toBe(true);
  });

  it("slugFromName handles accents", () => {
    expect(ICP.slugFromName("Tecnologia & Inovação")).toBe("tecnologia-inovacao");
  });

  it("update changes fields", () => {
    const icp = ICP.create({ name: "Test", slug: "test", content: "c", ownerId: "u1" }).unwrap();
    icp.update({ name: "Updated", status: "active" });
    expect(icp.name).toBe("Updated");
    expect(icp.statusValue).toBe("active");
  });

  it("update rejects invalid status", () => {
    const icp = ICP.create({ name: "Test", slug: "test", content: "c", ownerId: "u1" }).unwrap();
    expect(icp.update({ status: "invalid" }).isLeft()).toBe(true);
  });
});
