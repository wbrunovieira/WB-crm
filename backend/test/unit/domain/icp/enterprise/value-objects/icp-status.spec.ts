import { describe, it, expect } from "vitest";
import { ICPStatus } from "@/domain/icp/enterprise/value-objects/icp-status.vo";

describe("ICPStatus", () => {
  it("creates valid statuses", () => {
    expect(ICPStatus.create("draft").isRight()).toBe(true);
    expect(ICPStatus.create("active").isRight()).toBe(true);
    expect(ICPStatus.create("archived").isRight()).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(ICPStatus.create("unknown").isLeft()).toBe(true);
  });

  it("draft() factory creates draft", () => {
    expect(ICPStatus.draft().value).toBe("draft");
  });
});
