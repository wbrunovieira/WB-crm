/**
 * O log de WhatsApp quebrava em dois pontos visíveis na tela do Bruno (15/09/2026):
 *
 * 1. Transcrição de áudio tem QUEBRA DE LINHA. O parser exigia que toda linha começasse com
 *    "[HH:MM] Remetente:" e devolvia null para as demais — então a continuação ("Obrigado")
 *    aparecia solta, fora de qualquer balão.
 *
 * 2. O horário era comparado em UTC. Desde a correção do fuso (14/09), o servidor grava o
 *    carimbo em horário de Brasília — a comparação passou a errar por 3 horas, e a mídia
 *    deixou de casar com a linha correspondente.
 */
import { describe, it, expect } from "vitest";
import { parseConversa } from "@/components/whatsapp/parse-conversa";

describe("parseConversa", () => {
  it("junta a continuação à mensagem anterior, em vez de soltá-la", () => {
    const linhas = parseConversa(
      "[12:18] Você: opa, beleza meu amigo. qualquer coisa me aciona aqui.\nObrigado",
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.text).toBe("opa, beleza meu amigo. qualquer coisa me aciona aqui.\nObrigado");
  });

  it("separa mensagens diferentes normalmente", () => {
    const linhas = parseConversa("[12:13] Você: oi\n[12:15] Bruno Maia: tudo bem?");
    expect(linhas).toHaveLength(2);
    expect(linhas[0]?.fromMe).toBe(true);
    expect(linhas[1]?.sender).toBe("Bruno Maia");
  });

  it("aguenta várias linhas de continuação", () => {
    const linhas = parseConversa("[09:00] Você: primeira\nsegunda\nterceira");
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.text).toBe("primeira\nsegunda\nterceira");
  });

  it("descarta texto solto antes de qualquer cabeçalho, sem quebrar", () => {
    // Descrição antiga, escrita antes do formato com carimbo, não deve derrubar a tela.
    const linhas = parseConversa("anotação livre sem formato\n[09:00] Você: oi");
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.text).toBe("oi");
  });

  it("devolve lista vazia para descrição vazia", () => {
    expect(parseConversa("")).toEqual([]);
    expect(parseConversa(null)).toEqual([]);
  });
});

describe("carimbo de hora em duas eras", () => {
  /**
   * A descrição da atividade mudou de fuso no meio da vida do sistema: até 14/09/2026 o
   * backend rodava em UTC e escrevia "[15:13]"; depois da correção passou a escrever "[12:13]"
   * para o mesmo instante. O timestamp da mídia no banco é sempre UTC.
   *
   * Casar com um fuso só conserta uma era e quebra a outra — conversas antigas ficariam sem
   * áudio para sempre. Estes testes fixam a tolerância às duas.
   */
  const instante = new Date("2026-09-14T15:13:00.000Z");

  it("o mesmo instante tem leitura em Brasília e em UTC", () => {
    const brasilia = instante.toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
    });
    const utc = instante.toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    });
    expect(brasilia).toBe("12:13");
    expect(utc).toBe("15:13");
    expect(brasilia).not.toBe(utc);
  });

  it("a descrição nova usa o horário de Brasília", () => {
    const linhas = parseConversa("[12:13] Você: (mensagem sem texto)");
    expect(linhas[0]?.time).toBe("12:13");
  });

  it("a descrição antiga, em UTC, continua sendo lida", () => {
    const linhas = parseConversa("[15:13] Você: (mensagem sem texto)");
    expect(linhas[0]?.time).toBe("15:13");
  });
});
