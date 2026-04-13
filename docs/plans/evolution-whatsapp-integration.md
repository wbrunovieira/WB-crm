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

## Fase 1 — Backend: webhook + registro automático de atividades ✅ CONCLUÍDA (2026-04-10)

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

## Fase 2 — UI: botão Click-to-WhatsApp com modal de envio ✅ CONCLUÍDA (2026-04-10)

**Objetivo**: enviar mensagem WhatsApp diretamente do perfil do Lead/Contact no CRM, com Activity criada imediatamente (sem depender do webhook).

### O que foi implementado

**Server Actions (`src/actions/whatsapp.ts`):**
- `sendWhatsAppMessage(to, text, contactName)` — envia texto via Evolution API e chama `processWhatsAppMessage` diretamente após o envio (não aguarda webhook). Idempotência garantida pelo `messageId @unique` caso o webhook chegue depois.
- `sendWhatsAppMedia(input)` — envia imagem/vídeo/documento/áudio via `sendMedia` da Evolution API e cria Activity com o `mediaLabel` correto.

**Modal (`src/components/whatsapp/WhatsAppSendModal.tsx`):**
- Cabeçalho verde WhatsApp com nome e número
- Textarea com Ctrl+Enter para enviar
- **Emoji picker** com 5 categorias (Recentes, Rostos, Gestos, Símbolos, Negócios) — insere no cursor, sem dependência externa
- **Anexo de mídia** — abre seletor de arquivos (imagem, vídeo, PDF, Word, Excel…), preview de imagem em thumbnail, envia via `sendMediaMessage`
- **Templates** — painel expansível carregado sob demanda, agrupado por categoria, clique aplica o texto
- `router.refresh()` após envio para atualizar a timeline sem recarregar

**Botão (`src/components/whatsapp/WhatsAppButton.tsx`):**
- Variante `icon` (círculo verde) nas páginas de Lead e Contact
- Variante `badge` disponível para outros contextos

**Evolution client (`src/lib/evolution/client.ts`):**
- `sendTextMessage()` — texto simples
- `sendMediaMessage()` — suporte a `image | video | document | audio` com base64 ou URL

**Admin — Templates WhatsApp:**
- Model `WhatsAppTemplate` (global, sem ownerId — gerenciado pelo admin)
- `src/actions/whatsapp-templates.ts` — CRUD com verificação de role admin
- `src/app/(dashboard)/admin/whatsapp-templates/page.tsx` — formulário + lista agrupada por categoria
- `src/components/admin/WhatsAppTemplateForm.tsx` e `WhatsAppTemplatesList.tsx`
- Card na página `/admin`

**Fix aplicado:** mensagens enviadas pelo CRM não criavam Activity (webhook `fromMe: true` inconsistente) → corrigido chamando `processWhatsAppMessage` diretamente na action.

### Critérios de teste (Fase 2)
- [x] Botão WhatsApp aparece apenas quando `whatsapp` preenchido
- [x] Modal abre com nome e número do contato
- [x] Enviar texto → mensagem chega no WhatsApp do destinatário
- [x] Activity aparece na timeline imediatamente após enviar (sem recarregar)
- [x] Emoji inserido no cursor ao clicar no picker
- [x] Arquivo anexado mostra preview; ao enviar, aparece como 📷/📄 na Activity
- [x] Template selecionado preenche o textarea
- [x] Admin consegue criar/editar/desativar templates em `/admin/whatsapp-templates`

---

## Fase 3 — UX: timeline estilo chat ✅ CONCLUÍDA (2026-04-10)

**Objetivo**: atividades WhatsApp exibidas como conversa visual, diferenciando enviado de recebido.

### O que foi implementado

**`src/components/whatsapp/WhatsAppMessageLog.tsx`** (client component):
- Parseia o log de conversa (`[HH:MM] Sender: texto`) linha a linha
- Mensagens enviadas ("Você") → bolinha à direita, fundo verde claro `#DCF8C6`
- Mensagens recebidas → bolinha à esquerda, fundo branco com borda
- Timestamp compacto ao lado de cada bolinha
- **Colapsado por padrão** com `previewCount` configurável
- Botão "Ver mais (N mensagens)" / "Ver menos" para expandir

**`src/components/activities/ActivityTimeline.tsx`**:
- Avatar verde com ícone WhatsApp para atividades do tipo `whatsapp`
- Badge "WhatsApp" verde no lugar do badge "Concluída"
- Usa `WhatsAppMessageLog` com `previewCount=3` (timeline compacta)
- Card com fundo `#f0fdf4` e borda `#25D366/20`

**`src/app/(dashboard)/activities/page.tsx`** (lista de atividades):
- Atividades WhatsApp renderizadas com `WhatsAppMessageLog` em vez de `<p>` simples

**`src/app/(dashboard)/activities/[id]/page.tsx`** (detalhe):
- Descrição WhatsApp renderizada com todas as mensagens expandidas
- Botão "← Voltar" usa `router.back()` (volta para a página de origem — Lead, Contact, etc.) em vez de hardcoded `/activities`

**Filtro na lista de atividades:**
- Chip "💬 WhatsApp" já existente filtra atividades do tipo `whatsapp`

### Critérios de teste (Fase 3)
- [x] Atividades recebidas e enviadas visualmente distintas (bolinha esq/dir)
- [x] Log de conversa legível cronologicamente com horário em cada linha
- [x] Timeline compacta (3 linhas) com expand para ver mais
- [x] Detalhe da atividade mostra todas as mensagens
- [x] Botão Voltar retorna para a página de origem
- [x] Filtro WhatsApp funciona na lista de atividades

---

## Fase 4 — Matching avançado ✅ CONCLUÍDA (2026-04-13)

**Objetivo**: matching robusto de números e ignorar números sem cadastro.

### O que foi implementado

- Matching por variações do número: com/sem código de país (55), com/sem DDD
- Mensagens de números não cadastrados no CRM são **ignoradas** (sem Activity órfã)
- Sessão de conversa: janela de 2h agrupa mensagens no mesmo card de atividade

### Critérios de teste (Fase 4)
- [x] Mensagem de número cadastrado com variação de formato → Activity vinculada corretamente
- [x] Mensagem de número desconhecido → ignorada (sem Activity criada)
- [x] Sessão de 2h agrupa mensagens consecutivas no mesmo card

---

## Fase 5 — Mídia: Google Drive + transcrição Whisper ✅ CONCLUÍDA (2026-04-13)

**Objetivo**: arquivos de mídia (áudio, imagem, vídeo, documento) recebidos pelo WhatsApp armazenados permanentemente e áudios/vídeos transcritos automaticamente.

### O que foi implementado

- Download de mídia via Evolution API (`getBase64FromMediaMessage`)
- Upload automático para pasta `WB-CRM/WhatsApp/{entityName}/` no Google Drive
- Suporte: áudio (.oga/.ogg), vídeo (mp4), imagem (jpg/png/webp), documento (pdf, etc.)
- API route `/api/evolution/media/[messageId]` — serve arquivos com auth + ownership + cache
- Áudios e vídeos submetidos ao WB Transcritor (Whisper large-v3-turbo) após upload
- Cron `*/15 * * * *` — `/api/evolution/check-transcriptions` — polling de jobs pendentes
- Atribuição de speaker: `fromMe=true` → nome do agente, `fromMe=false` → `pushName` ou "Cliente"
- UI inline: `AudioPlayer`, `VideoPlayer`, `ImagePreview` (lightbox), `DocumentDownload`

### Critérios de teste (Fase 5)
- [x] Áudio recebido → upload no Drive, transcrição salva, player inline com botão de transcrição
- [x] Imagem → thumbnail clicável com lightbox + download
- [x] Documento → abre em nova aba (preview nativo) + botão de download
- [x] Vídeo → player inline com transcrição expansível
- [x] Fix: imagem com legenda não aparece duplicada

---

## Status das fases

| Fase | Descrição | Status |
|---|---|---|
| 1 | Backend: webhook + sessões agrupadas + WhatsAppMessage | ✅ Concluída (2026-04-10) |
| 2 | UI: modal de envio + emoji + mídia + templates + admin | ✅ Concluída (2026-04-10) |
| 3 | UX: timeline estilo chat com bolinhas e expand | ✅ Concluída (2026-04-10) |
| 4 | Matching avançado: variações de número, ignorar desconhecidos | ✅ Concluída (2026-04-13) |
| 5 | Mídia: Google Drive + transcrição Whisper inline | ✅ Concluída (2026-04-13) |
