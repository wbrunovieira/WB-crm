import { describe, it, expect } from "vitest";
import { CallDuration } from "@/domain/integrations/goto/enterprise/value-objects/call-duration.vo";

describe("CallDuration", () => {
  it("create(0) → right(0)", () => {
    const result = CallDuration.create(0);
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe(0);
  });

  it("create(90) → right(90)", () => {
    const result = CallDuration.create(90);
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe(90);
  });

  it("create(-1) → left(error)", () => {
    const result = CallDuration.create(-1);
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
  });

  it("create(-100) → left(error)", () => {
    const result = CallDuration.create(-100);
    expect(result.isLeft()).toBe(true);
  });

  describe("format()", () => {
    it("0s → '0s'", () => {
      const d = CallDuration.create(0).unwrap();
      expect(d.format()).toBe("0s");
    });

    it("45s → '45s'", () => {
      const d = CallDuration.create(45).unwrap();
      expect(d.format()).toBe("45s");
    });

    it("90s → '1min 30s'", () => {
      const d = CallDuration.create(90).unwrap();
      expect(d.format()).toBe("1min 30s");
    });

    it("120s → '2min 0s'", () => {
      const d = CallDuration.create(120).unwrap();
      expect(d.format()).toBe("2min 0s");
    });

    it("3661s → '61min 1s'", () => {
      const d = CallDuration.create(3661).unwrap();
      expect(d.format()).toBe("61min 1s");
    });
  });
});
