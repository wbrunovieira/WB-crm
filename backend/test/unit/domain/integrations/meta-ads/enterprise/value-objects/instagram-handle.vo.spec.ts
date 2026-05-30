import { describe, it, expect } from "vitest";
import { InstagramHandle } from "@/domain/integrations/meta-ads/enterprise/value-objects/instagram-handle.vo";

describe("InstagramHandle VO", () => {
  it("normaliza removendo o @ inicial", () => {
    const r = InstagramHandle.create("@wbdigital");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("wbdigital");
  });

  it("remove espaços ao redor", () => {
    const r = InstagramHandle.create("  wbdigital  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("wbdigital");
  });

  it("trata @ com espaços antes (trim antes do strip)", () => {
    const r = InstagramHandle.create("  @wbdigital");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("wbdigital");
  });

  it("remove múltiplos @ iniciais", () => {
    const r = InstagramHandle.create("@@wbdigital");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("wbdigital");
  });

  it("mantém handle sem @", () => {
    const r = InstagramHandle.create("wbdigital");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("wbdigital");
  });

  it("rejeita vazio", () => {
    const r = InstagramHandle.create("");
    expect(r.isLeft()).toBe(true);
  });

  it("rejeita só @", () => {
    const r = InstagramHandle.create("@");
    expect(r.isLeft()).toBe(true);
  });

  it("rejeita só espaços", () => {
    const r = InstagramHandle.create("   ");
    expect(r.isLeft()).toBe(true);
  });

  it("rejeita null/undefined", () => {
    expect(InstagramHandle.create(null).isLeft()).toBe(true);
    expect(InstagramHandle.create(undefined).isLeft()).toBe(true);
  });

  it("toString e equals", () => {
    const a = InstagramHandle.create("@wb");
    const b = InstagramHandle.create("wb");
    if (a.isRight() && b.isRight()) {
      expect(a.value.toString()).toBe("wb");
      expect(a.value.equals(b.value)).toBe(true);
    }
  });
});
