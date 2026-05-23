import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { WarmingAccountsRepository } from "../repositories/warming-accounts.repository";
import { WarmingPoolEmailsRepository } from "../repositories/warming-pool-emails.repository";
import { WarmingSendsRepository } from "../repositories/warming-sends.repository";
import { WarmingSend } from "../../enterprise/entities/warming-send.entity";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

const WARMING_SUBJECTS = [
  "Novidades em IA que vi essa semana",
  "Tendência: automação no setor comercial",
  "Tecnologia que pode transformar seu negócio",
  "Update rápido — o que está acontecendo no mercado",
  "Compartilhando algo interessante",
  "Stack que está em alta agora",
  "Ferramenta que descobri recentemente",
  "Observação sobre transformação digital",
  "O que está movimentando o mercado de tech",
  "Insights da semana em desenvolvimento",
  "Esse conteúdo pode te interessar",
  "Dica rápida de produtividade",
  "Reflexão sobre o mercado digital",
  "Uma coisa que aprendi essa semana",
  "Você viu esse movimento no setor?",
  "Automação: onde estamos em 2025",
  "Inteligência artificial no dia a dia das empresas",
  "Estratégia que está funcionando agora",
  "Novidade no ecossistema de tecnologia",
  "Pensando no crescimento do seu negócio",
  "Conectando pontos sobre o mercado",
  "Tendência que você precisa conhecer",
  "Rápido compartilhamento de valor",
  "O que as empresas mais eficientes estão fazendo",
  "Uma perspectiva diferente sobre tecnologia",
  "Mercado em movimento — vale a leitura",
  "Oportunidade que identifiquei recentemente",
  "Curiosidade do mundo tech",
  "Atualização sobre o cenário digital",
  "Boas práticas que vi por aí",
];

const WARMING_BODIES = [
  "<p>Oi, tudo bem?</p><p>Estava lendo sobre as últimas tendências em IA e automação e lembrei de você. Está valendo dar uma olhada em como isso pode impactar o setor.</p><p>Abraço,<br>Bruno</p>",
  "<p>Olá!</p><p>Só passando para compartilhar um conteúdo interessante sobre transformação digital que vi essa semana. O mercado está se movimentando bastante.</p><p>Qualquer novidade, estamos por aqui.</p><p>Att,<br>Bruno</p>",
  "<p>Boa semana!</p><p>Descobri uma ferramenta nova que pode ser útil dependendo do contexto do seu negócio. Quando tiver um tempinho, vale a leitura.</p><p>Abraço!</p>",
  "<p>Olá,</p><p>Rápido update: o mercado de tecnologia está acelerando muito em automação e IA generativa. Interessante acompanhar essas mudanças.</p><p>Att, Bruno</p>",
  "<p>Oi!</p><p>Estava pensando em você e queria manter contato. Como estão as coisas por aí? Qualquer novidade no universo de tecnologia, compartilho por aqui.</p><p>Abraço,<br>Bruno</p>",
  "<p>Olá!</p><p>Semana produtiva por aqui. Tenho acompanhado bastante o avanço das ferramentas de automação e como elas estão reduzindo custos operacionais nas empresas. Vale ficar de olho.</p><p>Grande abraço,<br>Bruno</p>",
  "<p>Oi, tudo certo?</p><p>Vi um case interessante essa semana de uma empresa que reduziu mais de 40% do tempo em processos repetitivos usando automação. O resultado foi impressionante.</p><p>Se quiser conversar sobre isso, estou à disposição.</p><p>Att,<br>Bruno</p>",
  "<p>Bom dia!</p><p>Passando para manter contato e compartilhar uma observação: as empresas que estão investindo em digitalização agora estão saindo na frente. O mercado está recompensando quem age rápido.</p><p>Abraço,<br>Bruno</p>",
  "<p>Olá!</p><p>Tenho uma dica de produtividade que tem funcionado muito bem: separar um tempo fixo por semana para revisar processos. Parece simples, mas o impacto no longo prazo é enorme.</p><p>Att,<br>Bruno</p>",
  "<p>Oi!</p><p>Curiosidade da semana: o uso de IA para análise de dados de clientes cresceu mais de 60% no último ano entre PMEs. O mercado está mudando mais rápido do que parece.</p><p>Qualquer dúvida ou conversa, é só chamar!</p><p>Abraço,<br>Bruno</p>",
  "<p>Olá,</p><p>Uma reflexão rápida: a maioria das empresas ainda subutiliza os dados que já tem. Antes de buscar novas tecnologias, vale a pena explorar o que já existe internamente.</p><p>Bom fim de semana!</p><p>Att,<br>Bruno</p>",
  "<p>Oi!</p><p>Estava organizando alguns materiais sobre estratégias de crescimento digital e pensei em você. O tema de integração entre vendas e marketing digital tem gerado resultados muito bons para quem aplica corretamente.</p><p>Grande abraço,<br>Bruno</p>",
  "<p>Olá!</p><p>Rápido check-in por aqui. Tenho visto muitas empresas migrando para soluções de CRM mais robustas para centralizar as informações de clientes. Quem faz isso bem tem uma vantagem competitiva enorme.</p><p>Att,<br>Bruno</p>",
  "<p>Oi, tudo bem?</p><p>Compartilhando uma tendência que tenho acompanhado: o uso de chatbots com IA para qualificação de leads está economizando horas de trabalho comercial por semana nas empresas que adotaram. Vale considerar.</p><p>Abraço,<br>Bruno</p>",
  "<p>Bom dia!</p><p>Uma coisa que aprendi recentemente: a consistência na comunicação com leads é mais importante do que a frequência. Menos é mais quando o conteúdo é relevante.</p><p>Boa semana,<br>Bruno</p>",
  "<p>Olá!</p><p>Só passando para manter o contato. Tenho acompanhado o mercado de tecnologia de perto e as oportunidades para empresas que digitalizam seus processos agora são enormes.</p><p>Qualquer novidade, estou por aqui.</p><p>Att,<br>Bruno</p>",
  "<p>Oi!</p><p>Dica rápida: uma das maiores alavancas de crescimento que vejo nas empresas é a automação do processo pós-venda. Cliente bem atendido depois da venda indica, e indicação tem custo zero.</p><p>Abraço,<br>Bruno</p>",
  "<p>Olá,</p><p>Observação do mercado essa semana: empresas que combinam dados de CRM com ações de marketing estão convertendo 3x mais do que as que trabalham essas áreas separadamente.</p><p>Grande abraço,<br>Bruno</p>",
  "<p>Oi!</p><p>Passando para dar um alô e compartilhar: o mercado de automação de marketing no Brasil cresceu 35% no último ano. Quem ainda não testou está ficando para trás.</p><p>Att,<br>Bruno</p>",
  "<p>Olá!</p><p>Uma coisa que tem me chamado atenção: as empresas mais eficientes que conheço têm em comum a obsessão por medir tudo. Sem dados, qualquer decisão é chute.</p><p>Boa semana,<br>Bruno</p>",
];

const AUTO_REPLY_SUBJECTS = [
  "Re: Obrigado pelo contato",
  "Re: Recebido, obrigado!",
  "Re: Com certeza!",
  "Re: Boa, obrigado por compartilhar",
  "Re: Interessante, obrigado",
  "Re: Recebi, valeu!",
  "Re: Perfeito, obrigado",
  "Re: Anotado, obrigado",
];

const AUTO_REPLY_BODIES = [
  "<p>Obrigado pelo contato! Recebi sua mensagem e logo retorno com mais detalhes.</p><p>Abraço!</p>",
  "<p>Olá! Recebido, muito obrigado. Fico feliz em manter esse canal aberto para novidades.</p><p>Att!</p>",
  "<p>Ótimo, obrigado! Fique à vontade para continuar compartilhando.</p><p>Abraço,<br>Bruno</p>",
  "<p>Recebi, valeu pelo compartilhamento! Sempre bom manter contato.</p><p>Att,<br>Bruno</p>",
  "<p>Obrigado! Muito interessante mesmo. Vou dar uma olhada com mais calma.</p><p>Grande abraço!</p>",
  "<p>Perfeito, obrigado pelo contato! Qualquer novidade pode mandar por aqui mesmo.</p><p>Att,<br>Bruno</p>",
  "<p>Valeu! Concordo com o ponto. O mercado está mudando rápido e é bom estar atualizado.</p><p>Abraço!</p>",
  "<p>Obrigado por compartilhar! Tenho acompanhado esse tema também, é uma tendência que veio para ficar.</p><p>Att,<br>Bruno</p>",
  "<p>Anotado, obrigado! Vou pesquisar mais sobre isso. Sempre bom trocar essas informações.</p><p>Grande abraço,<br>Bruno</p>",
  "<p>Recebi! Obrigado por lembrar de mim. Qualquer novidade interessante, pode compartilhar.</p><p>Att,<br>Bruno</p>",
  "<p>Boa, obrigado pelo conteúdo! Realmente faz sentido para o contexto atual do mercado.</p><p>Abraço,<br>Bruno</p>",
  "<p>Muito obrigado! Esse tipo de troca é sempre bem-vindo. Vamos mantendo contato.</p><p>Att!</p>",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

@Injectable()
export class RunWarmingCycleUseCase {
  constructor(
    private readonly accounts: WarmingAccountsRepository,
    private readonly poolEmails: WarmingPoolEmailsRepository,
    private readonly sends: WarmingSendsRepository,
    private readonly gmail: GmailPort,
  ) {}

  async execute({ ownerId }: { ownerId: string }): Promise<Either<never, { totalSent: number }>> {
    const activeAccounts = await this.accounts.findAllActive(ownerId);
    if (activeAccounts.length === 0) return right({ totalSent: 0 });

    const pool = await this.poolEmails.findAllActive(ownerId);
    let totalSent = 0;

    for (const account of activeAccounts) {
      const alreadySentToday = await this.sends.countTodayByAccount(account.id.toString());
      let remaining = account.dailyVolume - alreadySentToday;
      if (remaining <= 0) continue;

      // 1. Send to other warming accounts first (cross-account warming)
      const otherAccounts = activeAccounts.filter((a) => !a.id.equals(account.id));
      for (const target of otherAccounts) {
        if (remaining <= 0) break;

        const subject = randomPick(WARMING_SUBJECTS);
        const body = randomPick(WARMING_BODIES);

        try {
          const { messageId, threadId } = await this.gmail.send({
            userId: account.email,
            to: target.email,
            subject,
            bodyHtml: body,
            from: account.email,
          });

          const send = WarmingSend.create({
            fromEmail: account.email,
            toEmail: target.email,
            subject,
            gmailMessageId: messageId,
            gmailThreadId: threadId,
            isAutoReply: false,
            warmingAccountId: account.id.toString(),
          });
          await this.sends.save(send);
          totalSent++;
          remaining--;

          // Auto-reply from target back (simulates engagement)
          const replySubject = randomPick(AUTO_REPLY_SUBJECTS);
          const replyBody = randomPick(AUTO_REPLY_BODIES);

          const reply = await this.gmail.send({
            userId: target.email,
            to: account.email,
            subject: replySubject,
            bodyHtml: replyBody,
            from: target.email,
            threadId,
          });

          const replySend = WarmingSend.create({
            fromEmail: target.email,
            toEmail: account.email,
            subject: replySubject,
            gmailMessageId: reply.messageId,
            gmailThreadId: reply.threadId,
            isAutoReply: true,
            warmingAccountId: account.id.toString(),
          });
          await this.sends.save(replySend);
        } catch {
          // continue on send failure
        }
      }

      // 2. Fill remaining volume with pool emails
      const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
      for (const poolEmail of shuffledPool) {
        if (remaining <= 0) break;

        const subject = randomPick(WARMING_SUBJECTS);
        const body = randomPick(WARMING_BODIES);

        try {
          const { messageId, threadId } = await this.gmail.send({
            userId: account.email,
            to: poolEmail.email,
            subject,
            bodyHtml: body,
            from: account.email,
          });

          const send = WarmingSend.create({
            fromEmail: account.email,
            toEmail: poolEmail.email,
            subject,
            gmailMessageId: messageId,
            gmailThreadId: threadId,
            isAutoReply: false,
            warmingAccountId: account.id.toString(),
          });
          await this.sends.save(send);
          totalSent++;
          remaining--;
        } catch {
          // continue on send failure
        }
      }
    }

    return right({ totalSent });
  }
}
