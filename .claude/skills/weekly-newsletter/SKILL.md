---
name: weekly-newsletter
description: Cria o e-mail SEMANAL de conteúdo/newsletter da WB Digital Solutions (para leads e clientes — não é cold/prospecção). Use sempre que o usuário pedir "o email da semana", "newsletter", "campanha semanal", "email de notícias para todos", ou algo do tipo. O fluxo: escolher o tema da semana → pesquisar notícias DATADAS + a "Curiosidade do Dia" → escrever no modelo de e-mail da WB → publicar como template de campanha (aparece em "Usar Template") → e, no fim, fazer uma CRÍTICA do conteúdo e VERIFICAR a fonte de cada informação.
---

# Newsletter semanal da WB Digital Solutions

E-mail recorrente (≈1×/semana) enviado a **leads e clientes**. **Não é prospecção** — é conteúdo. Idioma **pt-BR**, tom **conversacional, anti-hype, parceiro** (nunca dedo na cara).

## Intuito do e-mail
1. **Dar informação** útil ao lead/cliente (notícia + dica prática).
2. **Construir autoridade** da WB (você entende de tecnologia e do negócio dele).
3. **Lembrar de dores e oportunidades de melhoria** sem soar vendedor.
4. Fazer ele **sentir a força da tecnologia** no dia a dia e na empresa dele.
5. **Variar o assunto toda semana** (ver rotação). A WB vende **websites, sistemas/plataformas sob medida, apps, e-commerce, automação e IA** — **IA entra só de vez em quando, como mais um serviço, nunca o herói toda semana.**

## Histórico (não repetir tema recente)
- 26/05 — IA que amplifica vence (Gartner)
- 09/06 — Pequenas na frente / planilha
- 16/06 — Automatizar o operacional antes da IA (VisiCalc)
- 23/06 — Terreno alugado (não depender só do Instagram) ← **modelo canônico**: `backend/src/domain/email-campaigns/templates/campaigns/2026-06-23-terreno-alugado.html`

## Rotação de temas (escolha 1, fora dos recentes)
- **Sites**: velocidade/mobile = dinheiro · site = vendedor 24/7 · SEO/Google local ("perto de mim") · terreno alugado (Instagram) · credibilidade/confiança em 3s.
- **Sistemas/plataformas**: integração (digitar a mesma coisa em 3 lugares) · decidir por dado/dashboard · área do cliente (autoatendimento) · estoque/agenda · sistema sob medida vs planilha+WhatsApp.
- **Apps**: dono do cliente vs marketplace (comissão) · push/recorrência/fidelidade · app pra equipe de campo.
- **E-commerce**: carrinho/checkout abandonado · Pix/meios de pagamento.
- **Autoridade**: LGPD/segurança/backup · custo invisível de não ter tecnologia · mitos ("pequena demais pra ter sistema") · case/bastidor · sazonal (Dia dos Pais, Black Friday).

---

## Passo 1 — Pesquisar (web) e VERIFICAR

> A qualidade do e-mail vive ou morre aqui. **Notícia datada > tendência genérica antiga.** **Sempre cite fonte e confirme antes de publicar.**

1. **Curiosidade do Dia** — fato de história da tecnologia ancorado na **data do envio** (ex.: 23/06 = nasce Alan Turing, 1912). Busque "tech history <data>" e confirme.
2. **"O que rolou na semana"** — 3 notícias recentes e úteis (de preferência Brasil + PME). Use `WebSearch` com o mês atual; mire em **eventos com data** (atualização do Google, comunicado do Banco Central, relatório novo), não em "tendências 2026" requentadas. Bons ângulos: Google/SEO, Pix/pagamentos, segurança/golpes, e-commerce, WhatsApp Business.
3. **Dados do corpo** (números) — 2–3 estatísticas fortes e brasileiras.
4. **VERIFIQUE cada número/afirmação** com `WebFetch` na fonte primária. Regras:
   - Se a fonte não bate (data, atribuição, número) → **corrija ou remova**.
   - Cuidado com proxies/agregadores: confirme quem produziu o dado (ex.: Fortinet, Sebrae/IBGE, Banco Central, Nuvemshop).
   - Cada notícia leva um link **(fonte)** clicável no HTML.

## Passo 2 — Escrever a copy (regras editoriais)
- **Parceria, não medo.** Reconheça o que o lead já faz bem ("seu Instagram trabalha — e isso é ótimo"), aí mostre a lacuna.
- **Linha de relevância** pra qualquer negócio: "vende produto, presta serviço ou atende presencial — muda o jogo nos três".
- **Linha de prova da WB** antes do CTA: "já colocamos no ar sites/lojas/sistemas para dezenas de negócios como o seu".
- **CTA leve** (topo de funil): "**Quero meu diagnóstico gratuito**" → WhatsApp com texto pré-preenchido. Evite "Falar agora" (pesado). 1 CTA só.
- **Dica prática** que puxa pra WB (começo DIY → "site que aparece no Google e vende, é aí que a gente entra").
- **Sem redundância** (não repetir a mesma ideia em analogia + citação + números).
- **Assunto curto** (≤ ~45 chars, gera curiosidade, sem corte no celular); o resto vai no **pré-cabeçalho**. Nada de CAIXA-ALTA, "!!!", "GRÁTIS".

## Passo 3 — Montar o HTML no modelo da WB

**Comece copiando o modelo canônico** (`2026-06-23-terreno-alugado.html`) e troque o conteúdo. Trabalhe num arquivo temporário, gere preview e abra no navegador:
```bash
mkdir -p /tmp/wb-email
# edite /tmp/wb-email/<slug>.html ; depois gere a preview com as merge tags resolvidas:
sed -e 's/{{saudacao}}/Bruno/g' -e 's/{{primeiro-nome}}/Bruno/g' -e 's/{{empresa}}/sua empresa/g' \
    -e 's#{{link_descadastro}}#https://www.wbdigitalsolutions.com/descadastrar#g' \
    /tmp/wb-email/<slug>.html > /tmp/wb-email/<slug>.preview.html
open /tmp/wb-email/<slug>.preview.html
```

### Identidade visual (manter)
- Cores: header/rodapé **`#350045`** (roxo escuro WB), primário **`#792990`**, CTA laranja **`#e8531e`**, âmbar **`#f5a623`**, fundo `#f4f4f7`, card `#fff`, texto `#444/#555/#888`.
- Fonte: `'Helvetica Neue',Helvetica,Arial,sans-serif`. Container **600px**.
- Logos (base `https://crm.wbdigitalsolutions.com/email-assets/`) — **REGRA DE CONTRASTE**:
  - Em **fundo escuro** (header/rodapé): `logo-wb-white.svg` (WB c/ branco) + `logo-salto.svg` (Salto claro).
  - Em **fundo claro**: `logo-wb.svg` + `logo-salto-dark.svg`.
  - **Nunca** use as versões escuras (`logo-wb.svg`, `logo-salto-dark.svg`) sobre fundo escuro — elas somem.
- **Co-marca WB + Salto** no rodapé. Contatos: `bruno@wbdigitalsolutions.com`, tel `+551150264203`, WhatsApp `https://wa.me/5511982864581`, site `https://www.wbdigitalsolutions.com`.
- Merge tags válidas: `{{primeiro-nome}}`, `{{saudacao}}`, `{{link_descadastro}}`, `{{empresa}}`.
- CTA WhatsApp com texto pré-preenchido: `https://wa.me/5511982864581?text=<urlencoded>`.

### Estrutura (ordem das seções)
preheader oculto → **header** (logo branca + barra "Websites · Sistemas · Plataformas · IA · Automação" + "Tecnologia ao serviço do seu negócio") → régua `#792990` → "Olá, {{saudacao}} 👋" → **manchete** → abertura → **🤔 Curiosidade do Dia** (card âmbar) → **Os números** (dado grande à esquerda) → **📍 3 motivos** (badges roxos numerados) → **📰 O que rolou na semana** (3 notícias c/ link de fonte) → **✅ Faça uma coisa hoje** (dica) → linha de prova + **CTA laranja** → assinatura (Bruno) → **rodapé co-marca**.

### Regras de HTML de e-mail (obrigatório)
Table-based (`role="presentation"`), **CSS inline**, preheader oculto, ≤600px, mobile-first, botão à prova de Outlook, `alt` em imagens, `<meta name="color-scheme" content="light dark">`. Sem flexbox/grid/CSS externo/JS.

## Passo 4 — Publicar como template ("Usar Template")

O construtor de campanha lê **arquivos HTML** de `backend/src/domain/email-campaigns/templates/campaigns/`. Para o e-mail aparecer:

1. Salve o arquivo com o nome **`YYYY-MM-DD-slug.html`** (data do envio; o slug vira o label, ex.: `2026-06-30-velocidade-mobile.html` → "Velocidade Mobile — 30 Jun 2026").
   ```bash
   cp /tmp/wb-email/<slug>.html \
     backend/src/domain/email-campaigns/templates/campaigns/YYYY-MM-DD-<slug>.html
   ```
2. **Primeira linha = o assunto** (preenche o campo Assunto automaticamente, ainda editável):
   ```html
   <!-- subject: Seu assunto curto aqui -->
   ```
3. Build (o `nest-cli` copia `**/*.html` → `dist`):
   ```bash
   cd backend && npm run build && cd ..
   ```
4. **Commit + deploy** (o arquivo precisa estar no `dist` do servidor):
   ```bash
   git add backend/src/domain/email-campaigns/templates/campaigns/
   git commit -m "content(email): add weekly newsletter template (<data>)"
   git push
   cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml
   ```
5. Após o deploy: no construtor → **"Usar Template"** → aparece o novo template, preenchendo **corpo + assunto**. (Hard refresh; só aparece depois do deploy concluir.)

**Envio**: NÃO disparar para todos. Deixa o template/rascunho pronto e o disparo fica com o usuário (confirmar sempre). Um rascunho de teste pode ser criado, mas só envia com confirmação.

## Passo 5 — CRÍTICA e ANÁLISE final (sempre, depois de pronto)
1. **Leia como o lead** (dono de PME, ocupado): qual a impressão em 5 segundos? O tom é parceria ou medo? Tem prova da WB? O CTA é leve? Fala com o negócio dele?
2. **Verifique fonte por fonte**: liste cada afirmação/número → veredito (✅ confirma / ⚠️ corrigir / ❌ remover) → link da fonte. Corrija o e-mail antes de concluir.
3. **Cheque o checklist**: assunto ≤45 chars + preheader; 1 CTA; logos certos no fundo certo; merge tags válidas; sem redundância; notícias datadas com fonte; IA não é o herói.
4. Resuma ao usuário: tema, as 3 notícias (com fonte verificada), o assunto, e o que ajustou.

## Notas
- **Tracking de abertura é inflado** (o proxy do Gmail carrega o pixel e conta 2× por uma abertura). Não é bug; explique se perguntarem.
- Servidor prod: `root@45.90.123.190`; CRM em `/opt/wb-crm`; banco no container `crm_postgres`. Deploy via `deploy/ansible/playbooks/quick-deploy.yml`.
