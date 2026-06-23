---
name: prospect-email
description: Escreve e-mail de prospecção (cold email), follow-up ou nurture para um lead do WB-crm, no estilo da WB Digital Solutions. Use sempre que o usuário pedir para criar/montar/redigir/escrever um e-mail para um lead (geralmente ele passa a URL ou o id do lead do CRM, ex.: crm.wbdigitalsolutions.com/leads/<id>). SEMPRE consulta o lead no CRM (dados + contatos + atividades já efetuadas) antes de escrever.
---

# Escrever e-mail de prospecção (WB Digital Solutions)

A WB Digital Solutions vende **websites, automação, sistemas sob medida e agentes de IA**. Estes e-mails são para leads do WB-crm (foco atual: PMEs da Serra Fluminense — Petrópolis/Teresópolis). Idioma: **pt-BR**, tom **consultivo e sem pressão**.

## Passo 1 — SEMPRE puxar o contexto do lead no CRM (antes de escrever)

O usuário normalmente passa a URL/id do lead. Consulte o banco de produção (read-only) por SSH para reunir contexto e **não repetir abordagem nem ignorar histórico**:

```bash
# Lead (id vem da URL .../leads/<id>); se só tiver o nome, troque por: WHERE "businessName" ILIKE '%nome%'
ssh -o StrictHostKeyChecking=no root@45.90.123.190 'docker exec crm_postgres psql -U crm_user -d crm_db -P pager=off \
 -c "SELECT \"businessName\",\"registeredName\",\"companyRegistrationID\",segment,city,website,email,phone,whatsapp,instagram,\"companyOwner\",description,quality FROM leads WHERE id='\''<LEAD_ID>'\'';" \
 -c "SELECT name,role,email,phone,whatsapp,linkedin,instagram,\"isPrimary\" FROM lead_contacts WHERE \"leadId\"='\''<LEAD_ID>'\'' ORDER BY \"isPrimary\" DESC;" \
 -c "SELECT type,subject,\"emailSubject\",completed,\"failedAt\",\"failReason\",to_char(\"createdAt\",'\''YYYY-MM-DD'\'') FROM activities WHERE \"leadId\"='\''<LEAD_ID>'\'' ORDER BY \"createdAt\" DESC LIMIT 20;"' 2>&1 | grep -v "post-quantum\|store now\|upgraded\|openssh.com/pq"
```

Da consulta, extraia: **nome do decisor** (contato principal / `companyOwner`), **segmento**, **tem site?**, **descrição/gancho já registrado**, e o **histórico de atividades**.

## Passo 2 — Definir o TIPO de e-mail pelas atividades

- **Primeiro contato (cold):** nenhuma atividade relevante → e-mail de apresentação completo.
- **Follow-up:** já houve ligação/e-mail → referencie a conversa, seja mais curto.
- **Nurture / "sem necessidade agora":** o lead recusou educadamente (ex.: nota/atividade dizendo isso) → e-mail curto, sem pressão, "ficar no radar" para o futuro (NÃO reapresentar tudo).
- **Reenvio após bounce:** se houver atividade de e-mail com `failedAt`/`failReason` (ex.: 554/URIBL) → reenviar texto limpo, sem links de tracking/co-branding; conferir o remetente.

## Passo 3 — Checklist dos pontos importantes (se faltar, PERGUNTE ao usuário)

1. **Destinatário (nome do decisor)** para a saudação ("Olá <Nome>"). Sem nome confiável → pergunte ou use saudação neutra.
2. **Gancho de abertura personalizado** — algo concreto da empresa (cidade, anos de mercado, dor observada, **indicação** de quem atendeu — se houver). Se não houver gancho claro, pergunte se há contexto (ex.: "falei com fulano", "vi que não têm site").
3. **Segmento + dores específicas** → escolher os serviços que fazem sentido (não listar tudo). Se o segmento não estiver claro, pergunte.
4. **Canal/endereço de envio** (e-mail do lead/contato). Se não houver e-mail, avise e sugira WhatsApp/Instagram.
5. **Cidade** para o "presencial aí em <cidade> ou online".

Só escreva quando tiver 1, 2, 3 e 5. Faltou algo importante → **pergunte antes**, não invente.

## Passo 4 — Adaptar os ganchos ao segmento (exemplos)

- **Sem site:** "quem procura no Google está indo para concorrentes" → site institucional + presença Google.
- **Construtora/incorporadora:** landing de empreendimentos + captação + IA que qualifica interessados.
- **Imobiliária:** site próprio + captação direta (menos dependência de Zap/OLX) + IA 24h.
- **Clínica/saúde:** agendamento online + lembretes por WhatsApp (reduz faltas) + IA de triagem.
- **Hotelaria/pousada:** site + motor de reservas próprio (menos comissão de OTA) + IA no WhatsApp.
- **Contabilidade/serviços:** site + portal do cliente + automação de obrigações/documentos.
- **Distribuidora/atacado:** catálogo digital + sistema de pedidos B2B + automação de WhatsApp.
- **Já tem site/marketing forte:** NÃO oferecer "site do zero" → automação, CRM, agentes de IA (upsell).

Diferencial da WB para citar: agentes de IA **especializados, treinados no contexto/documentos do cliente** — "além de um chatbot".

## Passo 5 — Estrutura e estilo (modelo cold/primeiro contato)

```
Olá <Nome>, tudo bem?

<Abertura personalizada: como cheguei até a empresa / gancho concreto / indicação>

Sou o Bruno, da WB Digital Solutions. A gente desenvolve tecnologia sob medida para empresas — websites, sistemas, automações e integrações construídos a partir da realidade de cada negócio, e não soluções de prateleira. <Na prática, ...>

<2 a 4 bullets de serviços/dores específicos do segmento>

<Para os que usam IA: parágrafo sobre agentes de IA especializados, "além de um chatbot">

Não parto do princípio de que vocês precisem de algo. Ainda assim, pelo que conheci da <Empresa>, acredito que há um bom potencial para eu ajudar, e por isso gostaria de propor uma conversa.

Encare como uma consultoria: vou agregar ideias a partir do que você me contar e, claro, apresentar o que a WB pode fazer. Da sua parte não há nenhum compromisso — no mínimo, você sai da conversa com algumas ideias práticas para aplicar aí, precisando de mim ou não.

Podemos fazer presencial aí em <Cidade> ou online, no dia e horário que for melhor para você. Topa marcarmos?

Fico à disposição.

Abraço,
Bruno
WB Digital Solutions
✉ bruno@wbdigitalsolutions.com
💬 +55 11 98286-4581
🌐 wbdigitalsolutions.com
```

Para **follow-up** e **nurture**, encurtar bastante e ajustar o tom (agradecer, referenciar a conversa, sem reapresentar tudo).

## Regras (lições já aprendidas)

- **Nunca invente** dados (nome, e-mail, site). Cuidado com **homônimos** — só use site/contato confirmado pelo CRM/fonte da cidade certa. Ver `[[feedback_prospect_data_quality]]`.
- **Não enviar** nada; só **entregar o texto** (assunto + corpo) para o usuário enviar pela plataforma. Se gerar rascunho no Gmail, confirmar antes.
- Reenvio após bounce: texto limpo, sem tracking/co-branding (ex.: evitar 554/URIBL); remetente `bruno@wbdigitalsolutions.com`.
- Excluir agências de marketing/publicidade/TI (concorrentes) — não são alvo.
- Entregue: **Assunto** + **Corpo** em blocos de código, prontos para colar.
