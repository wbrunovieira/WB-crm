# Integração Evolution API — WhatsApp no WB-CRM

## Objetivo

Integrar o WhatsApp (via Evolution API já rodando no servidor) ao CRM para:
1. Registrar automaticamente como atividade toda mensagem enviada ou recebida pelo WhatsApp — de qualquer dispositivo (celular, desktop, web, CRM)
2. Enviar mensagens WhatsApp diretamente pelo CRM com criação automática de atividade

---

## Infraestrutura existente

| Item | Detalhe |
|---|---|
| Evolution API | `https://evolution.wbdigitalsolutions.com` (interno: `localhost:8080`) |
| Instância | `wbdigital` |
| Número conectado | `5511982864581` (Bruno — WB Digital Solutions) |
| API Key | `EV0_984A52DF63B9CD6606C3C8ADE89A739FEB04E55E_2026` |
| Webhook atual | `http://n8n:5678/webhook/evolution` (evento: `MESSAGES_UPSERT`) |
| Secret atual | `WB_EVO_N8N_SECRET_2026` |

## Cobertura da integração

| Cenário | Capturado? |
|---|---|
| Cliente envia mensagem | ✅ automático (webhook `fromMe: false`) |
| Usuário envia pelo celular | ✅ automático (webhook `fromMe: true`) |
| Usuário envia pelo WhatsApp Desktop | ✅ automático |
| Usuário envia pelo WhatsApp Web | ✅ automático |
| Usuário envia pelo CRM (botão) | ✅ automático |
| Mensagens de grupos | ⛔ ignorado intencionalmente |
| Histórico anterior à conexão Evolution | ⛔ não retroativo |

## Formato do webhook (MESSAGES_UPSERT)

```json
{
  "event": "messages.upsert",
  "instance": "wbdigital",
  "data": {
    "key": {
      "id": "3EB01081F1354E81040EE4",
      "fromMe": false,
      "remoteJid": "5511999998888@s.whatsapp.net"
    },
    "pushName": "Nome do Contato",
    "messageType": "conversation",
    "message": {
      "conversation": "Olá, gostaria de mais informações"
    },
    "messageTimestamp": 1775839536
  }
}
```

Grupos identificados por `remoteJid` terminando em `@g.us` → ignorar.

---

## Decisões de arquitetura

### Agrupamento de mensagens por sessão (janela de 2 horas)

Clientes WhatsApp frequentemente enviam várias mensagens fragmentadas para expressar uma única ideia. Criar uma Activity por mensagem resultaria em spam na timeline.

**Regra**: mensagens do mesmo contato com menos de 2 horas de diferença pertencem à mesma sessão e são agrupadas em uma única Activity.

```
[14:22] Cliente: Oi Bruno
[14:22] Cliente: Preciso de um orçamento       ← mesma Activity
[14:23] Cliente: Para um site institucional    ← mesma Activity
[14:45] Você: Claro! Vou preparar e te envio  ← mesma Activity

[17:30] Cliente: Chegou o orçamento?           ← NOVA Activity (gap > 2h)
```

A description da Activity vira um **log de conversa formatado**:
```
[14:22] Cliente: Oi Bruno
[14:22] Cliente: Preciso de um orçamento
[14:23] Cliente: Para um site institucional
[14:45] Você: Claro! Vou preparar e te envio
```

### Tabela auxiliar WhatsAppMessage

Cada mensagem individual é registrada na tabela `WhatsAppMessage` com seu `messageId @unique` para:
- **Idempotência**: evitar criar registro se o webhook disparar duas vezes
- **Histórico completo**: cada mensagem individual recuperável via API
- **Pesquisa futura**: buscar por texto de mensagem, tipo, data
- **Base para mídia futura**: campos prontos para URL de arquivo quando integração com Google Drive for implementada

```
WhatsAppMessage {
  id               — cuid
  messageId        — key.id do WhatsApp (@unique)
  remoteJid        — número do contato (ex: "5511999998888@s.whatsapp.net")
  fromMe           — true = enviado por nós, false = recebido
  messageType      — "conversation" | "audio" | "image" | "video" | "document" | "sticker" | ...
  text             — texto extraído (null para mídia sem legenda)
  mediaLabel       — ex: "🎤 Áudio (45s)", "📷 Imagem", "📄 proposta.pdf" (null para texto)
  mediaUrl         — URL temporária do CDN WhatsApp (para uso futuro com Google Drive)
  mediaMimeType    — mime type do arquivo (para uso futuro)
  timestamp        — DateTime da mensagem
  activityId       — FK para Activity (a sessão que agrupa esta mensagem)
  ownerId          — FK para User
  createdAt
}
```

As Activities de tipo `whatsapp` são entidades distintas das demais atividades agendadas (call, meeting, task). Podem ser pesquisadas separadamente via API por `type: "whatsapp"` e futuramente por texto dentro de `WhatsAppMessage`.

### Tipos de mídia na Fase 1

URLs de mídia do WhatsApp expiram (CDN com TTL). Na Fase 1, registramos apenas o tipo com emoji para não perder o contexto:

| Tipo | Anotação na Fase 1 | Fase futura |
|---|---|---|
| Áudio | `🎤 Áudio (45s)` | Download → Google Drive + transcrição Whisper |
| Imagem | `📷 Imagem` + caption | Download → Google Drive |
| Vídeo | `📹 Vídeo (12s)` + caption | Download → Google Drive |
| Documento | `📄 arquivo.pdf` | Download → Google Drive |
| Sticker | `🎭 Sticker` | — |
| Localização | `📍 Localização` + endereço | — |

### Por que manter o forward para n8n?
Evolution suporta apenas 1 URL de webhook por instância. O CRM recebe o evento, processa (cria Activity), e depois faz `fetch` para o n8n em background. Assim as automações existentes do n8n continuam funcionando.

### Reuso do number-matcher
O módulo `src/lib/goto/number-matcher.ts` usa `regexp_replace` no PostgreSQL para normalizar números. A integração Evolution cria `src/lib/evolution/number-matcher.ts` com a mesma lógica, buscando nos campos `whatsapp` E `phone` de todos os tipos (Contact, Lead, Partner).

### Por que ignorar grupos?
Grupos têm `remoteJid@g.us` com múltiplos participantes. Vincular a um único Lead/Contact seria impreciso. Fase futura pode oferecer "vincular conversa de grupo a um Deal" explicitamente.

---

## Fase 1 — Backend: webhook + registro automático de atividades ✅ CONCLUÍDA

**Objetivo**: toda mensagem WhatsApp (enviada ou recebida, de qualquer dispositivo) gerar Activity automática no CRM vinculada ao Lead/Contact/Partner correspondente, com mensagens da mesma sessão agrupadas.

### Banco de dados

**Novo model `WhatsAppMessage`** em `prisma/schema.prisma`:
```prisma
model WhatsAppMessage {
  id            String   @id @default(cuid())
  messageId     String   @unique  // key.id do WhatsApp — idempotência
  remoteJid     String
  fromMe        Boolean
  messageType   String
  text          String?           // texto puro (null para mídia sem legenda)
  mediaLabel    String?           // "🎤 Áudio (45s)", "📷 Imagem", etc.
  mediaUrl      String?           // URL temporária CDN WhatsApp (uso futuro)
  mediaMimeType String?
  timestamp     DateTime
  activityId    String?
  ownerId       String
  createdAt     DateTime @default(now())

  activity  Activity? @relation(fields: [activityId], references: [id], onDelete: SetNull)
  owner     User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([remoteJid])
  @@index([activityId])
  @@index([ownerId])
  @@index([timestamp])
  @@map("whatsapp_messages")
}
```

Migration: `add_whatsapp_message_table`

### Arquivos criados

- `src/lib/evolution/types.ts` — tipos TypeScript do payload do webhook
- `src/lib/evolution/client.ts` — cliente HTTP da Evolution API (sendText)
- `src/lib/evolution/number-matcher.ts` — extrai número do `remoteJid`, busca em `phone` E `whatsapp` de Contact/Lead/Partner
- `src/lib/evolution/message-activity-creator.ts` — lógica de sessão + criação/atualização de Activity + criação de WhatsAppMessage
- `src/app/api/evolution/webhook/route.ts` — handler do webhook:
  1. Valida secret via header `x-webhook-secret`
  2. Filtra grupos (`@g.us`) — ignora
  3. Verifica idempotência via `WhatsAppMessage.messageId`
  4. Chama `processWhatsAppMessage()`
  5. **Faz forward do payload bruto para n8n** em background

### Lógica de sessão (message-activity-creator)

```
1. Extrair número: remoteJid → "5511999998888"
2. Buscar entidade: matchPhoneToEntity() → Contact/Lead/Partner
3. Verificar sessão aberta:
   SELECT Activity WHERE (contactId/leadId/partnerId = X)
     AND type = "whatsapp"
     AND updatedAt > NOW() - INTERVAL '2 hours'
   ORDER BY updatedAt DESC LIMIT 1
4. Se sessão existe → ATUALIZAR description (append nova linha)
5. Se não existe → CRIAR nova Activity
6. Criar WhatsAppMessage vinculado à Activity
```

### Variáveis de ambiente

```
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=EV0_984A52DF63B9CD6606C3C8ADE89A739FEB04E55E_2026
EVOLUTION_INSTANCE=wbdigital
EVOLUTION_WEBHOOK_SECRET=<gerar com openssl rand -hex 32>
EVOLUTION_OWNER_ID=<id do usuário dono das atividades>
```

### Reconfiguração do webhook Evolution

Após deploy, executar via API:
```bash
curl -X PUT https://evolution.wbdigitalsolutions.com/webhook/set/wbdigital \
  -H "apikey: EV0_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://crm.wbdigitalsolutions.com/api/evolution/webhook",
    "webhook_by_events": false,
    "webhook_base64": false,
    "events": ["MESSAGES_UPSERT"],
    "headers": { "x-webhook-secret": "<secret gerado>" }
  }'
```

### Critérios de teste (Fase 1)
- [ ] Receber mensagem de lead cadastrado → Activity aparece com texto e horário
- [ ] Enviar 3 mensagens seguidas → todas agrupadas na mesma Activity
- [ ] Aguardar 2h e enviar nova mensagem → nova Activity criada
- [ ] Enviar mensagem pelo celular → capturado automaticamente
- [ ] Mensagem de grupo → nenhuma atividade criada
- [ ] Mensagem de número desconhecido → Activity criada sem vínculo
- [ ] Webhook disparar duas vezes com mesmo messageId → sem duplicata
- [ ] Automações do n8n continuam funcionando

### Deploy
```bash
git add . && git commit -m "feat: Evolution WhatsApp webhook — session-grouped activities" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml
```

---

## Fase 2 — UI: botão Click-to-WhatsApp com modal de envio

**Objetivo**: enviar mensagem WhatsApp diretamente do perfil do Lead/Contact no CRM, com Activity atualizada automaticamente via webhook (sem duplicação).

### Componentes a criar/modificar

**Server Action:**
- `src/actions/whatsapp.ts` — `sendWhatsAppMessage(to, text, entityRef)`:
  1. Chama Evolution API `POST /message/sendText/wbdigital`
  2. Retorna `{ success, messageId }` — Activity será criada pelo webhook automaticamente
  3. Se webhook falhar: fallback cria Activity diretamente

**Componente de modal:**
- `src/components/whatsapp/WhatsAppSendModal.tsx` — modal com:
  - Cabeçalho: nome do contato + número
  - Textarea para digitar a mensagem
  - Botão enviar com loading state
  - Toast de sucesso/erro
  - Fecha após envio

**Integração nas páginas de detalhe:**
- `src/components/leads/LeadHeader.tsx` — botão WhatsApp verde ao lado do telefone (visível somente se `lead.whatsapp` preenchido)
- `src/components/contacts/ContactHeader.tsx` — mesmo padrão

### Critérios de teste (Fase 2)
- [ ] Botão WhatsApp aparece apenas quando `whatsapp` preenchido
- [ ] Modal abre com número pré-preenchido
- [ ] Enviar → mensagem chega no WhatsApp do destinatário
- [ ] Activity aparece na timeline automaticamente (via webhook)
- [ ] Mensagem de erro exibida se número inválido

### Deploy
```bash
git add . && git commit -m "feat: click-to-WhatsApp send modal on Lead/Contact" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml
```

---

## Fase 3 — UX: timeline estilo chat

**Objetivo**: atividades WhatsApp exibidas como conversa visual, diferenciando enviado de recebido.

### Melhorias

**`src/components/activities/ActivityTimeline.tsx`** — atividades WhatsApp:
- Ícone verde + logo WhatsApp
- Badge "WhatsApp" verde
- Log de conversa com bolhinhas: enviadas à direita (verde-claro), recebidas à esquerda (branco)
- Data/hora de cada linha do log
- Suporte a renderização de `mediaLabel` com ícone

**Filtro na lista de atividades:**
- Chip "WhatsApp" filtra apenas atividades de tipo `whatsapp`

### Critérios de teste (Fase 3)
- [ ] Atividades recebidas e enviadas visualmente distintas
- [ ] Log de conversa legível cronologicamente
- [ ] Filtro WhatsApp funciona na lista de atividades

### Deploy
```bash
git add . && git commit -m "feat: WhatsApp chat-style timeline view" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml
```

---

## Fase 4 — Matching avançado: números desconhecidos

**Objetivo**: não perder mensagens de números não cadastrados.

### Funcionalidade

- Activity criada com `unknownPhone` preenchido quando número não encontrado
- Badge "Sem cadastro" na lista de atividades
- Botão "Criar Lead" pré-preenche o formulário com o número no campo `whatsapp`
- Botão "Vincular" permite associar a um Lead/Contact já existente

### Critérios de teste (Fase 4)
- [ ] Mensagem de número desconhecido → Activity com `unknownPhone`
- [ ] Badge "Sem cadastro" visível
- [ ] "Criar Lead" pré-preenche `whatsapp`
- [ ] Após vincular, Activity aparece na timeline do Lead

### Deploy
```bash
git add . && git commit -m "feat: unknown WhatsApp number tracking and quick lead creation" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml
```

---

## Fase 5 — Mídia: Google Drive + transcrição Whisper

**Objetivo**: arquivos de mídia (áudio, imagem, vídeo, documento) recebidos pelo WhatsApp armazenados permanentemente e áudios transcritos automaticamente.

### Funcionalidade

- Download do arquivo de mídia antes da URL do CDN expirar
- Upload para Google Drive (integração Google prevista)
- Link permanente salvo em `WhatsAppMessage.mediaUrl`
- Para áudios: envio para API Whisper (app já existente) → texto transcrito salvo em `WhatsAppMessage.text`
- Na timeline: botão "Ver no Drive" e texto da transcrição visível

### Pré-requisito
- Integração Google Drive implementada
- Endpoint da API Whisper configurado

---

## Status das fases

| Fase | Descrição | Status |
|---|---|---|
| 1 | Backend: webhook + sessões agrupadas + WhatsAppMessage | 🔲 Pendente |
| 2 | UI: Click-to-WhatsApp com modal de envio | 🔲 Pendente |
| 3 | UX: timeline estilo chat | 🔲 Pendente |
| 4 | Matching: números desconhecidos | 🔲 Pendente |
| 5 | Mídia: Google Drive + transcrição Whisper | 🔲 Pendente |
