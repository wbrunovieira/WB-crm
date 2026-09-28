import { describe, it, expect, vi, beforeEach } from "vitest";
import { buscarTudo, agruparPorTipo, type SearchHit } from "@/lib/global-search";

vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }));
import { apiFetch } from "@/lib/api-client";
const mockado = vi.mocked(apiFetch);

const ORGS = [{ id: "o1", name: "Gomez Studio", city: "Petrópolis", state: "Rio de Janeiro" }];
const LEADS = { leads: [{ id: "l1", businessName: "Padaria Colonial", city: "Petrópolis", state: null }] };
const CONTATOS = [{ id: "c1", name: "Rafaela Souza", organization: { name: "Tem Tudo" } }];

/** Routes answer in a fixed order: organizations, leads, contacts. */
function responder(orgs: unknown, leads: unknown, contatos: unknown) {
  mockado.mockImplementation(async (...args: unknown[]) => {
    // O harness invoca o mock uma vez sem argumentos ao limpar entre testes; `buscarTudo`
    // sempre chama com um caminho. Tolerar a chamada vazia evita um TypeError que não diz
    // nada sobre o comportamento sob teste.
    const path = typeof args[0] === "string" ? args[0] : "";
    if (path.startsWith("/organizations")) {
      if (orgs instanceof Error) throw orgs;
      return orgs;
    }
    if (path.startsWith("/leads")) {
      if (leads instanceof Error) throw leads;
      return leads;
    }
    if (path.startsWith("/contacts")) {
      if (contatos instanceof Error) throw contatos;
      return contatos;
    }
    return [];
  });
}

beforeEach(() => mockado.mockReset());

describe("buscarTudo", () => {
  it("normaliza os três formatos diferentes de resposta", async () => {
    responder(ORGS, LEADS, CONTATOS);
    const { hits, parcial } = await buscarTudo("tok", "petro");

    expect(parcial).toBe(false);
    expect(hits).toHaveLength(3);
    // leads vêm em envelope paginado; os outros dois, em array cru
    expect(hits.map((h) => h.kind)).toEqual(["organization", "lead", "contact"]);
    expect(hits.map((h) => h.name)).toEqual(["Gomez Studio", "Padaria Colonial", "Rafaela Souza"]);
  });

  it("monta o href da rota certa para cada tipo", async () => {
    responder(ORGS, LEADS, CONTATOS);
    const { hits } = await buscarTudo("tok", "x");
    expect(hits.map((h) => h.href)).toEqual(["/organizations/o1", "/leads/l1", "/contacts/c1"]);
  });

  it("usa cidade/estado como detalhe, e a empresa no caso do contato", async () => {
    responder(ORGS, LEADS, CONTATOS);
    const { hits } = await buscarTudo("tok", "x");
    expect(hits[0].detail).toBe("Petrópolis - Rio de Janeiro");
    expect(hits[1].detail).toBe("Petrópolis"); // sem estado: sem travessão pendurado
    expect(hits[2].detail).toBe("Tem Tudo");
  });

  it("deixa o detalhe nulo quando não há cidade nem estado", async () => {
    responder([{ id: "o9", name: "Sem Endereço", city: null, state: null }], { leads: [] }, []);
    const { hits } = await buscarTudo("tok", "x");
    expect(hits[0].detail).toBeNull();
  });

  it("mostra o que deu certo quando UMA das buscas falha, e sinaliza que é parcial", async () => {
    responder(new Error("500"), LEADS, CONTATOS);
    const { hits, parcial } = await buscarTudo("tok", "x");

    // O resultado parcial é o ponto: uma lista vazia aqui seria lida como "não existe",
    // que é pior que não responder.
    expect(parcial).toBe(true);
    expect(hits.map((h) => h.kind)).toEqual(["lead", "contact"]);
  });

  it("sinaliza parcial mesmo quando nada sobra", async () => {
    responder(new Error("500"), new Error("500"), new Error("500"));
    const { hits, parcial } = await buscarTudo("tok", "x");
    expect(hits).toHaveLength(0);
    expect(parcial).toBe(true);
  });

  it("limita a 5 por grupo para o dropdown não virar uma lista infinita", async () => {
    const muitos = Array.from({ length: 12 }, (_, i) => ({ id: `o${i}`, name: `Org ${i}`, city: null, state: null }));
    responder(muitos, { leads: [] }, []);
    const { hits } = await buscarTudo("tok", "x");
    expect(hits).toHaveLength(5);
  });

  it("tolera envelope de leads sem a chave leads", async () => {
    responder([], {}, []);
    const { hits, parcial } = await buscarTudo("tok", "x");
    expect(hits).toHaveLength(0);
    expect(parcial).toBe(false);
  });

  it("escapa o termo na URL", async () => {
    responder([], { leads: [] }, []);
    await buscarTudo("tok", "Café & Cia");
    const caminhos = mockado.mock.calls.map((c) => c[0] as string);
    expect(caminhos.every((p) => p.includes("Caf%C3%A9%20%26%20Cia"))).toBe(true);
  });
});

describe("agruparPorTipo", () => {
  it("ordena clientes, depois leads, depois contatos, e omite grupo vazio", () => {
    const hits: SearchHit[] = [
      { kind: "contact", id: "c", name: "C", detail: null, href: "/contacts/c" },
      { kind: "organization", id: "o", name: "O", detail: null, href: "/organizations/o" },
    ];
    expect(agruparPorTipo(hits).map(([k]) => k)).toEqual(["organization", "contact"]);
  });
});
