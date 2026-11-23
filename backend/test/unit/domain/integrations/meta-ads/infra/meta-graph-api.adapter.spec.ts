import { describe, expect, it } from "vitest";
import type { ConfigService } from "@nestjs/config";
import { MetaGraphApiAdapter } from "@/domain/integrations/meta-ads/infra/meta-graph-api.adapter";

function configFake(valor?: string): ConfigService {
  return { get: () => valor } as unknown as ConfigService;
}

describe("MetaGraphApiAdapter", () => {
  it("é construído mesmo sem META_USER_TOKEN, para não impedir o boot da aplicação", () => {
    // Validar no construtor derruba a aplicação inteira no boot: o Nest instancia
    // todos os providers na subida, então uma instância que não usa o Meta Ads não
    // conseguiria nem iniciar. A credencial é cobrada no uso, não na construção.
    expect(() => new MetaGraphApiAdapter(configFake(undefined))).not.toThrow();
  });

  it("falha com mensagem clara ao ser usado sem o token configurado", async () => {
    const adapter = new MetaGraphApiAdapter(configFake(undefined));

    await expect(adapter.check("@alguem")).rejects.toThrow(/META_USER_TOKEN/);
  });
});
