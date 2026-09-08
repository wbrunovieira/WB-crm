/**
 * A conversão precisa levar TODO campo que existe nos dois lados.
 *
 * Caso concreto (produção, 08/09/2026): o lead 7b9e6f0f foi transferido para operações às
 * 15:23 e convertido às 15:31. O lead ficou com inOperationsAt preenchido e a organização
 * nasceu com o campo nulo — a transferência simplesmente sumiu no caminho, sem erro nenhum.
 *
 * O segundo teste é o que realmente importa: em vez de checar os campos que alguém lembrou de
 * listar, ele LÊ O SCHEMA e falha sempre que um campo escalar existe em Lead e Organization
 * com o mesmo nome e não é carregado. Foi a terceira vez na semana que um dado atravessou mal
 * de um lado para o outro; um teste que enumera casos conhecidos não impede a quarta.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ConvertLeadToOrganizationUseCase } from "@/domain/lead-conversion/application/use-cases/convert-lead-to-organization.use-case";
import { FakeLeadConversionRepository } from "../../fakes/fake-lead-conversion.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: FakeLeadConversionRepository;
let sut: ConvertLeadToOrganizationUseCase;

const EM_OPERACOES = new Date("2026-09-08T15:23:08.129Z");

function semear(overrides: Partial<Parameters<typeof Lead.create>[0]> = {}) {
  const lead = Lead.create(
    {
      ownerId: "user-1",
      businessName: "Refrigeração Garrido Ltda.",
      inOperationsAt: EM_OPERACOES,
      driveFolderId: "1AbCdEfGhIjKlMnOpQrStUv",
      ...overrides,
    },
    new UniqueEntityID("lead-1"),
  );
  repo.seedLead({
    lead, contacts: [], secondaryCNAEIds: [],
    techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] },
  });
  return lead;
}

const converter = () =>
  sut.execute({ leadId: "lead-1", requesterId: "user-1", requesterRole: "admin" });

beforeEach(() => {
  repo = new FakeLeadConversionRepository();
  sut = new ConvertLeadToOrganizationUseCase(repo);
});

describe("ConvertLeadToOrganizationUseCase — paridade de campos", () => {
  it("leva a transferência para operações junto", async () => {
    semear();

    const result = await converter();

    expect(result.isRight()).toBe(true);
    expect(repo.lastPayload?.organization.inOperationsAt?.toISOString()).toBe(
      EM_OPERACOES.toISOString(),
    );
  });

  it("leva a pasta de documentos junto", async () => {
    // O lead é arquivado na conversão, então não há duplicidade: é entrega da pasta, e sem ela
    // a organização perde tudo que foi reunido durante a prospecção.
    semear();

    await converter();

    expect(repo.lastPayload?.organization.driveFolderId).toBe("1AbCdEfGhIjKlMnOpQrStUv");
  });

  it("deixa nulo quando o lead não tinha o campo", async () => {
    semear({ inOperationsAt: undefined, driveFolderId: undefined });

    await converter();

    expect(repo.lastPayload?.organization.inOperationsAt).toBeUndefined();
    expect(repo.lastPayload?.organization.driveFolderId).toBeUndefined();
  });

  it("nenhum campo escalar comum aos dois modelos fica para trás", () => {
    // Guarda contra a CLASSE do bug, não contra o caso: lê o schema e cobra a conversão.
    // Se um campo novo for adicionado aos dois modelos e não for carregado, este teste quebra
    // com o nome dele — em vez de alguém descobrir meses depois com o dado já perdido.
    const raiz = join(__dirname, "../../../../../..");
    const schema = readFileSync(join(raiz, "prisma/schema.prisma"), "utf8");
    // DOIS arquivos enumeram campo a campo, e o dado precisa sobreviver aos dois: a use case
    // monta a entidade e o repositorio a grava. Neste bug o campo passou pela primeira e foi
    // descartado na segunda — por isso a guarda cobra as duas, nao so a use case.
    const conversao = [
      "src/domain/lead-conversion/application/use-cases/convert-lead-to-organization.use-case.ts",
      "src/domain/lead-conversion/infra/repositories/prisma-lead-conversion.repository.ts",
    ].map((f) => readFileSync(join(raiz, f), "utf8"));

    const camposDe = (modelo: string): Set<string> => {
      const bloco = new RegExp(`^model ${modelo} \\{([\\s\\S]*?)^\\}`, "m").exec(schema);
      if (!bloco) throw new Error(`model ${modelo} não encontrado no schema`);
      const nomes = new Set<string>();
      for (const linha of bloco[1].split("\n")) {
        const limpa = linha.split("//")[0].trim();
        if (!limpa || limpa.startsWith("@@")) continue;
        const [nome, tipo] = limpa.split(/\s+/);
        if (!nome || !tipo || tipo.includes("[]")) continue;
        // relações são carregadas por outro caminho (contatos, CNAEs, tech profile)
        if (/^(Lead|Organization|User|Contact|Deal|Activity|Label|CNAE|Partner|ICP)\??$/.test(tipo)) continue;
        nomes.add(nome);
      }
      return nomes;
    };

    // Exclusões deliberadas: identidade, auditoria e os campos que registram a própria conversão.
    const naoSeCopia = new Set([
      "id", "createdAt", "updatedAt", "ownerId", "status",
      "sourceLeadId", "convertedToOrganizationId", "convertedAt",
      "isArchived", "archivedAt", "archiveReason",
    ]);

    const lead = camposDe("Lead");
    const org = camposDe("Organization");
    const naoCarregados = [...lead]
      .filter((f) => org.has(f) && !naoSeCopia.has(f))
      .filter((f) => !conversao.every((arquivo) => new RegExp(`\\b${f}\\b`).test(arquivo)))
      .sort();

    expect(naoCarregados, "campos presentes nos dois modelos que a conversão não leva").toEqual([]);
  });
});
