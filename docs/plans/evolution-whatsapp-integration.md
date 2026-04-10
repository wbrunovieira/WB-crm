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

## Fase 1 — Backend: webhook + registro automático de atividades

**Objetivo**: toda mensagem WhatsApp (enviada ou recebida, de qualquer dispositivo) gerar Activity automática no CRM vinculada ao Lead/Contact/Partner correspondente.

### Arquivos a criar/modificar

**Banco de dados:**
- `prisma/schema.prisma` — adicionar campo `evolutionMessageId String? @unique` na model Activity (mesmo padrão do `gotoCallId`)
- `npm run db:migrate` — migration `add_evolution_message_id_to_activity`

**Biblioteca Evolution:**
- `src/lib/evolution/types.ts` — tipos TypeScript do payload do webhook
- `src/lib/evolution/client.ts` — cliente HTTP da Evolution API (sendText, etc.)
- `src/lib/evolution/number-matcher.ts` — extrai número do `remoteJid`, busca Lead/Contact/Partner nos campos `phone` E `whatsapp` (reusa lógica de `src/lib/goto/number-matcher.ts`)
- `src/lib/evolution/message-activity-creator.ts` — converte evento webhook em Activity:
  - `fromMe: false` → `subject: "WhatsApp recebido — {nome}"`
  - `fromMe: true` → `subject: "WhatsApp enviado — {nome}"`
  - `description`: texto da mensagem
  - `dueDate`: `messageTimestamp` convertido para Date
  - `completed: true`, `completedAt`: mesmo que `dueDate`
  - `evolutionMessageId`: `key.id` (previne duplicatas)

**Webhook:**
- `src/app/api/evolution/webhook/route.ts` — recebe `MESSAGES_UPSERT`:
  1. Valida secret via header ou query param
  2. Filtra grupos (`@g.us`) — ignora
  3. Filtra tipos sem texto (sticker, audio, image sem caption) — registra como "Mídia WhatsApp"
  4. Chama `createWhatsAppActivity()`
  5. **Faz forward do payload bruto para n8n** (`http://n8n:5678/webhook/evolution`) — preserva automações existentes

**Variáveis de ambiente** (`.env` do servidor):
```
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=EV0_984A52DF63B9CD6606C3C8ADE89A739FEB04E55E_2026
EVOLUTION_INSTANCE=wbdigital
EVOLUTION_WEBHOOK_SECRET=WB_EVO_CRM_SECRET_2026
```

**Reconfiguração do webhook:**
- Mudar URL do Evolution de `http://n8n:5678/webhook/evolution` → `https://crm.wbdigitalsolutions.com/api/evolution/webhook`
- Feito via API da Evolution após o deploy

### Critérios de teste (Fase 1)
- [ ] Enviar mensagem para o número do CRM pelo próprio celular → Activity aparece no Lead/Contact vinculado
- [ ] Receber mensagem de um lead cadastrado → Activity aparece com texto e horário corretos
- [ ] Mensagem de número não cadastrado → Activity criada sem vínculo (sem leadId/contactId) — para revisão
- [ ] Mensagem de grupo → nenhuma atividade criada
- [ ] Segunda mensagem da mesma conversa → segunda Activity criada (não duplica — `evolutionMessageId` diferente por mensagem)
- [ ] Automações do n8n continuam funcionando (forward preservado)

### Deploy
```bash
git add . && git commit -m "feat: Evolution WhatsApp webhook — auto activity from messages" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml
```

---

## Fase 2 — UI: botão Click-to-WhatsApp com modal de envio

**Objetivo**: enviar mensagem WhatsApp diretamente do perfil do Lead/Contact no CRM, com Activity criada automaticamente.

### Componentes a criar/modificar

**Server Action:**
- `src/actions/whatsapp.ts` — `sendWhatsAppMessage(to: string, text: string, entityRef)`:
  1. Chama Evolution API `POST /message/sendText/wbdigital`
  2. Cria Activity com `type: "whatsapp"`, `evolutionMessageId: key.id` retornado pela API
  3. Retorna `{ success, activityId }`

**Componente de modal:**
- `src/components/whatsapp/WhatsAppSendModal.tsx` — modal com:
  - Cabeçalho: número destino + nome do contato
  - Textarea para digitar a mensagem
  - Botão enviar com loading state
  - Feedback de sucesso/erro via toast
  - Fecha após envio bem-sucedido

**Integração nas páginas de detalhe:**
- `src/components/leads/LeadHeader.tsx` (ou onde está o cabeçalho do Lead) — adicionar botão WhatsApp verde ao lado do telefone, visível somente se `lead.whatsapp` preenchido
- `src/components/contacts/ContactHeader.tsx` — mesmo padrão para Contact

### Fluxo de deduplicação outgoing
1. CRM envia mensagem via Evolution API → recebe `key.id` na resposta
2. CRM cria Activity com `evolutionMessageId = key.id`
3. Webhook dispara (Fase 1) com `fromMe: true` e o mesmo `key.id`
4. `@unique` no banco rejeita silenciosamente → nenhuma Activity duplicada

### Critérios de teste (Fase 2)
- [ ] Botão WhatsApp aparece apenas quando `whatsapp` está preenchido no Lead/Contact
- [ ] Modal abre com número pré-preenchido
- [ ] Enviar mensagem → mensagem chega no WhatsApp do destinatário
- [ ] Activity "WhatsApp enviado" aparece na timeline do Lead/Contact imediatamente
- [ ] Mensagem de erro exibida se número inválido ou API indisponível
- [ ] Enviar pelo celular logo depois → **não** cria Activity duplicada

### Deploy
```bash
git add . && git commit -m "feat: click-to-WhatsApp modal with auto activity on Contact/Lead" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml
```

---

## Fase 3 — UX: distinção visual e histórico WhatsApp

**Objetivo**: facilitar a leitura das atividades WhatsApp na timeline, diferenciando enviadas de recebidas e mostrando o contexto da conversa.

### Melhorias visuais na timeline

**`src/components/activities/ActivityTimeline.tsx`** — atividades WhatsApp:
- Ícone: verde com logo WhatsApp (SVG)
- Badge "WhatsApp" verde
- Atividades `fromMe: true` (enviadas) → alinhadas à direita com fundo verde-claro
- Atividades `fromMe: false` (recebidas) → alinhadas à esquerda com fundo branco
- Estilo chat/bolha (semelhante ao WhatsApp)
- Data e hora sempre visíveis

**Indicador de direção:**
- Campo adicional no schema: `whatsappDirection String?` — valores: `"inbound"` | `"outbound"` — preenchido na criação
- Permite filtrar "apenas recebidas" ou "apenas enviadas" futuramente

**Filtro na lista de atividades:**
- Adicionar chip/botão "WhatsApp" nos filtros de tipo da tela de Activities

### Critérios de teste (Fase 3)
- [ ] Atividades recebidas com visual diferente das enviadas
- [ ] Histórico cronológico de conversa legível na timeline
- [ ] Filtro "WhatsApp" na lista de atividades funciona

### Deploy
```bash
git add . && git commit -m "feat: WhatsApp activity visual distinction and direction field" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml
```

---

## Fase 4 — Matching avançado: números sem cadastro

**Objetivo**: não perder atividades de números desconhecidos e facilitar o cadastro a partir delas.

### Funcionalidade

Quando o número não é encontrado no CRM:
- Activity é criada com `leadId = null`, `contactId = null`
- Campo adicional `unknownPhone String?` armazena o número bruto
- Na tela de Activities, atividades sem vínculo ficam destacadas com badge "Sem cadastro"
- Botão "Criar Lead" ou "Vincular a Lead existente" na Activity sem vínculo
- Ao criar Lead pelo botão: pré-preenche `whatsapp` com o número e redireciona para o formulário de Lead

### Critérios de teste (Fase 4)
- [ ] Mensagem de número desconhecido → Activity criada com `unknownPhone` preenchido
- [ ] Activity aparece na lista com badge "Sem cadastro"
- [ ] Botão "Criar Lead" abre formulário com `whatsapp` pré-preenchido
- [ ] Após vincular, Activity aparece na timeline do Lead

### Deploy
```bash
git add . && git commit -m "feat: unknown phone tracking and quick lead creation from WhatsApp activity" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml
```

---

## Status das fases

| Fase | Descrição | Status |
|---|---|---|
| 1 | Backend: webhook + registro automático | 🔲 Pendente |
| 2 | UI: Click-to-WhatsApp com modal de envio | 🔲 Pendente |
| 3 | UX: distinção visual enviado/recebido | 🔲 Pendente |
| 4 | Matching avançado: números desconhecidos | 🔲 Pendente |

---

## Decisões de arquitetura

### Por que manter o forward para n8n?
Evolution suporta apenas 1 URL de webhook por instância. O CRM recebe o evento, processa (cria Activity), e depois faz `fetch` para o n8n em background. Assim as automações existentes do n8n não quebram e o CRM também registra tudo.

### Por que `evolutionMessageId` e não apenas `key.id`?
Cada mensagem WhatsApp tem um `key.id` único gerado pelo WhatsApp. Armazenar esse ID garante idempotência: se o webhook disparar duas vezes (retry do Evolution), a segunda tentativa simplesmente falha no `@unique` constraint sem criar duplicata.

### Por que ignorar grupos?
Grupos têm `remoteJid@g.us` com múltiplos participantes. Vincular a um único Lead/Contact seria impreciso. Fase futura pode oferecer "vincular conversa de grupo a um Deal" explicitamente.

### Reuso do number-matcher
O módulo `src/lib/goto/number-matcher.ts` usa `regexp_replace` no PostgreSQL para normalizar números. A integração Evolution cria `src/lib/evolution/number-matcher.ts` com a mesma lógica, mas buscando também nos campos `whatsapp` além de `phone`.
