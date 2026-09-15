export interface LinhaConversa {
  time: string;
  sender: string;
  text: string;
  fromMe: boolean;
}

const CABECALHO = /^\[(\d{2}:\d{2})\]\s+([^:]+):\s*(.*)$/;

/**
 * Converte a descricao da atividade nas mensagens da conversa.
 *
 * Uma mensagem pode ocupar VARIAS linhas — transcricao de audio vem com quebras. O parser
 * anterior exigia cabecalho em toda linha e descartava as demais, o que fazia a continuacao
 * ("Obrigado") aparecer solta fora do balao na tela do Bruno.
 *
 * Linha sem cabecalho agora e continuacao da anterior. Texto solto ANTES do primeiro cabecalho
 * e ignorado: e anotacao de formato antigo, e derrubar a tela por causa dela seria pior.
 */
export function parseConversa(descricao: string | null | undefined): LinhaConversa[] {
  if (!descricao) return [];

  const linhas: LinhaConversa[] = [];
  for (const bruta of descricao.split("\n")) {
    const m = bruta.match(CABECALHO);
    if (m) {
      const [, time, sender, text] = m;
      linhas.push({
        time,
        sender: sender.trim(),
        text: text.trim(),
        fromMe: sender.trim() === "Você",
      });
      continue;
    }
    const anterior = linhas[linhas.length - 1];
    if (anterior) anterior.text = anterior.text ? `${anterior.text}\n${bruta}` : bruta;
  }
  return linhas;
}
