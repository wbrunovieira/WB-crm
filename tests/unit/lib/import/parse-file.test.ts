/**
 * Parse Import File — Unit Tests
 *
 * Tests for src/lib/import/parse-file.ts
 * Covers CSV and XLSX parsing, returning { headers, rows }.
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect } from "vitest";
import { parseCSV, type ParsedImportFile } from "@/lib/import/parse-file";

// ---------------------------------------------------------------------------
// Helpers para gerar buffers de CSV em testes
// ---------------------------------------------------------------------------
function csvBuffer(content: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
describe("parseCSV — headers", () => {
  it("extrai cabeçalhos da primeira linha", () => {
    const buf = csvBuffer("Nome,Email,Telefone\nEmpresa A,a@a.com,11999");
    const result = parseCSV(buf);
    expect(result.headers).toEqual(["Nome", "Email", "Telefone"]);
  });

  it("remove espaços em branco dos cabeçalhos", () => {
    const buf = csvBuffer(" Nome , Email , Telefone \nEmpresa A,a@a.com,11999");
    const result = parseCSV(buf);
    expect(result.headers).toEqual(["Nome", "Email", "Telefone"]);
  });

  it("remove BOM (\\uFEFF) do início do arquivo", () => {
    const buf = csvBuffer("\uFEFFNome,Email\nEmpresa A,a@a.com");
    const result = parseCSV(buf);
    expect(result.headers[0]).toBe("Nome");
  });

  it("suporta separador ponto-e-vírgula", () => {
    const buf = csvBuffer("Nome;Email;Telefone\nEmpresa A;a@a.com;11999");
    const result = parseCSV(buf);
    expect(result.headers).toEqual(["Nome", "Email", "Telefone"]);
  });
});

// ---------------------------------------------------------------------------
describe("parseCSV — rows", () => {
  it("retorna linhas como objetos key-value usando os cabeçalhos", () => {
    const buf = csvBuffer("Nome,Email\nEmpresa A,a@a.com\nEmpresa B,b@b.com");
    const result = parseCSV(buf);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ Nome: "Empresa A", Email: "a@a.com" });
    expect(result.rows[1]).toEqual({ Nome: "Empresa B", Email: "b@b.com" });
  });

  it("lida com valores vazios", () => {
    const buf = csvBuffer("Nome,Email,Telefone\nEmpresa A,,11999");
    const result = parseCSV(buf);
    expect(result.rows[0]).toEqual({ Nome: "Empresa A", Email: "", Telefone: "11999" });
  });

  it("remove espaços em branco dos valores", () => {
    const buf = csvBuffer("Nome,Email\n  Empresa A  ,  a@a.com  ");
    const result = parseCSV(buf);
    expect(result.rows[0]).toEqual({ Nome: "Empresa A", Email: "a@a.com" });
  });

  it("suporta valores entre aspas com vírgulas internas", () => {
    const buf = csvBuffer('Nome,Endereço\nEmpresa A,"Rua das Flores, 123"');
    const result = parseCSV(buf);
    expect(result.rows[0]["Endereço"]).toBe("Rua das Flores, 123");
  });

  it("ignora linhas completamente vazias", () => {
    const buf = csvBuffer("Nome,Email\nEmpresa A,a@a.com\n\nEmpresa B,b@b.com\n");
    const result = parseCSV(buf);
    expect(result.rows).toHaveLength(2);
  });

  it("retorna array vazio se não há linhas de dados", () => {
    const buf = csvBuffer("Nome,Email\n");
    const result = parseCSV(buf);
    expect(result.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe("parseCSV — totalRows", () => {
  it("retorna o total de linhas de dados (excluindo cabeçalho e vazias)", () => {
    const buf = csvBuffer("Nome,Email\nA,a@a.com\nB,b@b.com\nC,c@c.com");
    const result = parseCSV(buf);
    expect(result.totalRows).toBe(3);
  });
});

// ---------------------------------------------------------------------------
describe("parseCSV — tipo de retorno", () => {
  it("retorna objeto ParsedImportFile com headers, rows e totalRows", () => {
    const buf = csvBuffer("Nome,Email\nEmpresa A,a@a.com");
    const result: ParsedImportFile = parseCSV(buf);
    expect(result).toHaveProperty("headers");
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("totalRows");
  });
});
