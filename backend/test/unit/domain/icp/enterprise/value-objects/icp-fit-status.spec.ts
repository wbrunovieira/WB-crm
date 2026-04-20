import { describe, it, expect } from "vitest";
import { ICPFitStatus } from "@/domain/icp/enterprise/value-objects/icp-fit-status.vo";

describe("ICPFitStatus", () => {
  it("creates valid fit statuses", () => {
    expect(ICPFitStatus.create("ideal").isRight()).toBe(true);
    expect(ICPFitStatus.create("partial").isRight()).toBe(true);
    expect(ICPFitStatus.create("out_of_icp").isRight()).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(ICPFitStatus.create("maybe").isLeft()).toBe(true);
  });
});
