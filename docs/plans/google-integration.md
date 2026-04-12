# Integração Google — Gmail, Drive e Meet no WB-CRM

## Objetivo

Integrar os serviços Google ao CRM para:
1. **Gmail** — enviar e receber e-mails dentro do CRM com registro automático de atividades
2. **Google Drive** — armazenar arquivos do CRM (propostas, anexos WhatsApp, gravações de GoTo e Meet) em pastas organizadas
3. **Google Meet** — agendar, iniciar e listar reuniões gravadas diretamente do perfil de Lead/Contato/Organização, com transcrição automática

---

## Infraestrutura necessária

| Item | Detalhe |
|---|---|
| Google Cloud Project | Criar projeto em `console.cloud.google.com` |
| APIs a ativar | Gmail API, Google Drive API, Google Calendar API, Cloud Pub/Sub API |
| OAuth 2.0 | Credenciais tipo "Web application" — Client ID + Client Secret |
| Redirect URI | `https://crm.wbdigitalsolutions.com/api/google/callback` |
| Scopes | `gmail.send`, `gmail.readonly`, `gmail.modify`, `drive.file`, `calendar`, `calendar.events` |
| Conta Google conectada | Conta da empresa (admin conecta uma vez) |

### Estratégia de autenticação

**Conta única da empresa** (OAuth2 com refresh token persistido no banco):
- O admin conecta a conta Google da WB Digital Solutions uma vez via fluxo OAuth
- O token de acesso é renovado automaticamente com o refresh token
- Todos os usuários do CRM usam essa conta compartilhada para enviar Gmail, acessar Drive e criar eventos no Calendar
- Simples, sem necessidade de cada usuário autenticar individualmente

```
Variáveis de ambiente a adicionar:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://crm.wbdigitalsolutions.com/api/google/callback
GOOGLE_PUBSUB_TOPIC=projects/SEU_PROJECT/topics/gmail-push (Fase 2)
```

---

## Estrutura de pastas no Google Drive

```
WB-CRM/
├── Propostas/
│   ├── [Nome do Lead]/
│   │   └── Proposta - [Título] - [Data].pdf
│   └── [Nome da Organização]/
├── Reuniões/
│   ├── [Nome do Lead|Contato|Organização]/
│   │   ├── [Data] - [Título da reunião].mp4   ← gravação
│   │   └── [Data] - [Título da reunião].txt   ← transcrição
│   └── ...
├── WhatsApp/
│   ├── Áudios/                                ← GoTo (pendente Fase 5 WA)
│   └── Anexos/                                ← imagens, docs recebidos (pendente Fase 5 WA)
├── GoTo/
│   └── Gravações/                             ← áudios do GoTo (integração futura)
└── Email Attachments/
    └── [Lead/Contato]/
```

Cada pasta de entidade (Lead, Organização) é criada automaticamente na primeira vez que um arquivo é salvo para ela. O ID da pasta Drive é armazenado no banco para acesso direto nas próximas operações.

---

## Modelo de dados (banco)

### `GoogleToken` — token OAuth da empresa

```prisma
model GoogleToken {
  id           String   @id @default(cuid())
  accessToken  String
  refreshToken String
  expiresAt    DateTime
  scope        String
  email        String   // email da conta Google conectada
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("google_tokens")
}
```

### `Proposal` — propostas vinculadas a Leads/Deals

```prisma
model Proposal {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      String   @default("draft")   // draft | sent | accepted | rejected
  driveFileId String?                       // ID do arquivo no Google Drive
  driveUrl    String?                       // URL de visualização no Drive
  sentAt      DateTime?
  leadId      String?
  dealId      String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  lead    Lead?    @relation(fields: [leadId], references: [id], onDelete: SetNull)
  deal    Deal?    @relation(fields: [dealId], references: [id], onDelete: SetNull)
  owner   User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([leadId])
  @@index([dealId])
  @@index([ownerId])
  @@map("proposals")
}
```

### `Meeting` — reuniões do Google Meet

```prisma
model Meeting {
  id              String    @id @default(cuid())
  title           String
  description     String?
  googleEventId   String?   @unique   // ID do evento no Google Calendar
  meetLink        String?             // URL do Google Meet
  startAt         DateTime
  endAt           DateTime?
  attendeeEmails  String              // JSON array de emails convidados
  status          String    @default("scheduled")  // scheduled | ongoing | done | cancelled
  // Gravação
  recordingDriveId  String?           // ID do arquivo de gravação no Drive
  recordingUrl      String?           // URL de reprodução
  // Transcrição
  transcriptDriveId String?
  transcriptText    String?
  transcribedAt     DateTime?
  // Vínculos
  leadId          String?
  contactId       String?
  organizationId  String?
  dealId          String?
  ownerId         String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  lead         Lead?         @relation(fields: [leadId], references: [id], onDelete: SetNull)
  contact      Contact?      @relation(fields: [contactId], references: [id], onDelete: SetNull)
  organization Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  deal         Deal?         @relation(fields: [dealId], references: [id], onDelete: SetNull)
  owner        User          @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([leadId])
  @@index([contactId])
  @@index([organizationId])
  @@index([ownerId])
  @@index([status])
  @@map("meetings")
}
```

### Campos adicionais em modelos existentes

```prisma
// Lead — pasta raiz no Drive para arquivos deste lead
driveFolderId  String?    // ID da pasta WB-CRM/Propostas/[Lead]/

// Organization
driveFolderId  String?

// Activity — para e-mails registrados
emailSubject   String?    // assunto do e-mail
emailMessageId String?    // Message-ID do Gmail (idempotência)
```

---

## Fase 0 — Infraestrutura OAuth Google

**Objetivo**: conectar a conta Google da empresa e persistir o token. Pré-requisito para todas as demais fases.

### Backend (TDD obrigatório)

**Arquivos a criar:**

- `src/lib/google/auth.ts` — cliente OAuth2 (google-auth-library), funções: `getAuthUrl()`, `exchangeCode(code)`, `refreshAccessToken()`, `getValidToken()`
- `src/lib/google/token-store.ts` — lê/escreve `GoogleToken` no banco (mesmo padrão do `goto/token-manager.ts`)
- `src/app/api/google/auth/route.ts` — redireciona para URL de consentimento Google
- `src/app/api/google/callback/route.ts` — recebe o code, troca por tokens, salva no banco, redireciona para `/admin/google`
- `src/app/(dashboard)/admin/google/page.tsx` — painel de conexão: botão "Conectar conta Google", status da conexão, email conectado, botão "Desconectar"

**Testes unitários:**
- `tests/unit/lib/google/auth.test.ts` — getAuthUrl gera URL com scopes corretos, exchangeCode chama API Google, getValidToken renova token expirado

**Variáveis de ambiente:**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://crm.wbdigitalsolutions.com/api/google/callback
```

### Critérios de teste (Fase 0)
- [ ] Botão "Conectar conta Google" em `/admin/google` redireciona para consentimento Google
- [ ] Após consentimento, callback salva tokens no banco
- [ ] Painel mostra e-mail da conta conectada e data de expiração
- [ ] Token é renovado automaticamente quando expira
- [ ] Desconectar apaga tokens do banco

---

## Fase 1 — Gmail: envio de e-mail com Activity automática

**Objetivo**: enviar e-mail formatado diretamente do perfil do Lead/Contato/Organização, com Activity criada automaticamente.

### Backend (TDD)

**Arquivos a criar:**

- `src/lib/google/gmail.ts` — funções: `sendEmail({ to, subject, html, attachments })`, `buildMimeMessage()` (MIME encoder para Gmail API), `createDraftEmail()`
- `src/actions/gmail.ts` — `sendGmailMessage(input)`: valida, chama gmail.ts, cria Activity do tipo `email`
- `src/lib/google/email-matcher.ts` — busca Lead/Contact/Organization pelo campo `email` (similar ao number-matcher do WhatsApp)

**Testes unitários:**
- `tests/unit/lib/google/gmail.test.ts` — buildMimeMessage gera MIME correto, sendEmail chama API Gmail, tratamento de erro
- `tests/unit/actions/gmail.test.ts` — auth obrigatória, validação (sem destinatário, sem assunto), Activity criada após envio

**Activity gerada:**
```
type: "email"
subject: "[assunto do e-mail]"
description: "[preview do corpo — primeiros 500 chars]"
emailSubject: "[assunto]"
emailMessageId: "[Message-ID retornado pela API]"
```

### Frontend

- `src/components/gmail/GmailComposeModal.tsx` — modal de composição:
  - Para: e-mail do Lead/Contato (pré-preenchido) + campo para adicionar CC
  - Assunto
  - Editor de texto rico (bold, italic, listas, links) — usar `contenteditable` ou `<textarea>` com formatação básica
  - Anexos (upload de arquivo → base64)
  - Templates: painel lateral com templates do Gmail (admin gerencia)
  - Ctrl+Enter envia
- `src/components/gmail/GmailButton.tsx` — botão "✉️ E-mail" nas páginas de Lead/Contato/Organização
- Admin: templates de e-mail em `/admin/gmail-templates` (mesmo padrão do WhatsApp)

### Critérios de teste (Fase 1)
- [ ] Botão "E-mail" aparece apenas quando campo email preenchido
- [ ] Modal abre com destinatário pré-preenchido
- [ ] Enviar → e-mail chega na caixa do destinatário (testar com e-mail próprio)
- [ ] Activity do tipo "email" aparece na timeline imediatamente
- [ ] Anexo enviado aparece no e-mail e na Activity
- [ ] Template aplicado preenche assunto e corpo

---

## Fase 2 — Gmail: recebimento automático de e-mails

**Objetivo**: e-mails recebidos de Leads/Contatos cadastrados geram Activity automaticamente no CRM.

### Estratégia: Gmail Push Notifications (Pub/Sub)

A Gmail API suporta notificações push via Google Cloud Pub/Sub — mais eficiente que polling:

```
Gmail → Pub/Sub Topic → Subscription → CRM webhook
```

**Alternativa simples**: polling a cada 5 minutos via cron/background job. Mais fácil de implementar, latência aceitável para CRM.

**Decisão para Fase 2**: polling periódico (cron a cada 5 min via endpoint interno). Migração para Pub/Sub na Fase 2b se necessário.

### Backend (TDD)

**Arquivos a criar:**

- `src/lib/google/gmail-poller.ts` — `pollNewEmails(sinceHistoryId)`: lista mensagens novas, filtra `INBOX`, extrai remetente/assunto/corpo
- `src/app/api/google/gmail-poll/route.ts` — endpoint interno (protegido por `INTERNAL_API_KEY`) que dispara o poll
- `src/lib/google/email-activity-creator.ts` — mesmo padrão do `message-activity-creator` do WhatsApp: busca entidade pelo e-mail do remetente, cria Activity, garante idempotência via `emailMessageId`

**Testes unitários:**
- `tests/unit/lib/google/email-activity-creator.test.ts` — idempotência, criação de Activity, vínculo correto, e-mail desconhecido não gera erro

**Idempotência**: `Activity.emailMessageId @unique` — mesmo e-mail processado duas vezes gera apenas uma Activity.

### Critérios de teste (Fase 2)
- [ ] E-mail recebido de lead cadastrado → Activity aparece na timeline em até 5 min
- [ ] E-mail recebido de endereço desconhecido → sem Activity (ignorado)
- [ ] Mesmo e-mail não gera duplicata
- [ ] Resposta a um e-mail já registrado → nova Activity (não agrupa por thread por ora)

---

## Fase 3 — Google Drive: base + Propostas para Leads

**Objetivo**: estrutura de pastas organizada no Drive + fluxo completo de proposta (criar → upload → vincular ao Lead → enviar por e-mail).

### Backend (TDD)

**Arquivos a criar:**

- `src/lib/google/drive.ts` — funções: `getOrCreateFolder(name, parentId?)`, `uploadFile({ name, mimeType, content, folderId })`, `getFileUrl(fileId)`, `deleteFile(fileId)`, `listFiles(folderId)`
- `src/lib/google/drive-folders.ts` — `getEntityFolder(entityType, entityId, entityName)`: cria/recupera pasta `WB-CRM/[Propostas|Reuniões|...]/[Nome da entidade]/` e persiste o `driveFolderId` no banco
- `src/actions/proposals.ts` — CRUD completo: `createProposal`, `uploadProposalFile`, `sendProposalByEmail`, `updateProposalStatus`, `deleteProposal`

**Testes unitários:**
- `tests/unit/lib/google/drive.test.ts` — getOrCreateFolder cria se não existe, retorna existente se já criada, uploadFile chama API corretamente
- `tests/unit/actions/proposals.test.ts` — auth, validação, upload cria registro no banco com driveFileId

### Frontend

- `src/components/proposals/ProposalUploadModal.tsx` — modal para adicionar proposta:
  - Título
  - Descrição
  - Upload de arquivo (PDF preferencial)
  - Status (rascunho/enviado)
  - Botão "Salvar no Drive" + "Enviar por e-mail"
- `src/components/proposals/ProposalsList.tsx` — lista de propostas de um Lead/Deal:
  - Nome, status, data, link para o Drive ("Abrir no Drive")
  - Botão "Enviar por e-mail" (abre GmailComposeModal pré-preenchido)
  - Botão delete
- Seção "Propostas" nas páginas de Lead e Deal

**Status de proposta:**

| Status | Cor | Descrição |
|---|---|---|
| `draft` | Cinza | Rascunho salvo |
| `sent` | Azul | Enviada ao cliente |
| `accepted` | Verde | Aceita |
| `rejected` | Vermelho | Recusada |

### Critérios de teste (Fase 3)
- [ ] Upload de proposta → arquivo aparece no Drive em `WB-CRM/Propostas/[Nome Lead]/`
- [ ] Proposta listada na aba do Lead com link funcional para o Drive
- [ ] Mudar status de "rascunho" para "enviado" registra `sentAt`
- [ ] Enviar proposta por e-mail usa o GmailComposeModal com anexo Drive
- [ ] Segundo upload para o mesmo Lead reutiliza a pasta existente (não cria duplicata)

---

## Fase 4 — Google Meet: agendamento de reuniões

**Objetivo**: agendar reuniões do Google Meet diretamente do Lead/Contato/Organização, com convite enviado por e-mail e reunião listada no perfil da entidade.

### Backend (TDD)

**Arquivos a criar:**

- `src/lib/google/calendar.ts` — funções: `createMeetEvent({ title, description, startAt, endAt, attendeeEmails })` → retorna `{ googleEventId, meetLink }`, `cancelMeetEvent(googleEventId)`, `getMeetEvent(googleEventId)`
- `src/actions/meetings.ts` — `scheduleMeeting(input)`, `cancelMeeting(id)`, `getMeetings(entityType, entityId)`

**Testes unitários:**
- `tests/unit/lib/google/calendar.test.ts` — createMeetEvent chama Calendar API, retorna meetLink, attendees incluídos
- `tests/unit/actions/meetings.test.ts` — auth, validação de datas, Activity criada após agendar

**Activity gerada ao agendar:**
```
type: "meeting"
subject: "[Título da reunião]"
description: "Google Meet — [data/hora]\nLink: [meetLink]"
dueDate: startAt
completed: false
```

### Frontend

- `src/components/meetings/ScheduleMeetingModal.tsx` — modal com:
  - Título do evento
  - Descrição
  - Data + hora início / fim
  - E-mails dos convidados (chips, separados por Enter/vírgula)
  - Pré-preenche com e-mail do Lead/Contato
  - Botão "Agendar"
- `src/components/meetings/MeetingsList.tsx` — seção "Reuniões" no perfil da entidade:
  - Reuniões futuras: data, título, status, botão "Entrar no Meet" (abre meetLink)
  - Reuniões passadas: data, título, botão "Ver gravação" (quando disponível)
  - Botão "Cancelar" (cancela o evento no Google Calendar)
- Seção "Reuniões" nas páginas de Lead, Contact e Organization

### Critérios de teste (Fase 4)
- [ ] Agendar reunião → evento criado no Google Calendar da conta conectada
- [ ] Convidado recebe e-mail com convite e pode aceitar/recusar para adicionar à agenda
- [ ] Reunião aparece listada no perfil do Lead/Contato com data e título
- [ ] Botão "Entrar no Meet" abre o link correto em nova aba
- [ ] Cancelar reunião remove o evento do Google Calendar
- [ ] Activity do tipo "meeting" aparece na timeline

---

## Fase 5 — Google Meet: gravações

**Objetivo**: gravações de reuniões armazenadas no Drive aparecem automaticamente no perfil da entidade com botão de reprodução.

### Como funcionam as gravações do Google Meet

O Google Meet salva gravações automaticamente no Google Drive do organizador quando:
- O plano Google Workspace suporta gravações (Business Standard, Business Plus, Enterprise)
- O organizador clica em "Gravar reunião" durante a chamada

As gravações aparecem em `Meu Drive/Reuniões gravadas/` com o padrão `[Título do evento] [Data].mp4`.

### Backend (TDD)

**Lógica de detecção automática:**

Após o horário de término de cada reunião com `status: "scheduled"`, um job periódico (cron a cada 15 min) verifica se há arquivo de gravação no Drive:

- `src/lib/google/recording-detector.ts` — `findRecordingForMeeting(meeting)`: busca no Drive por arquivos recém-criados com nome similar ao título da reunião, move para `WB-CRM/Reuniões/[Entidade]/`, salva `recordingDriveId` e `recordingUrl` no banco, atualiza status para `"done"`
- `src/app/api/google/check-recordings/route.ts` — endpoint interno chamado pelo cron

**Testes unitários:**
- `tests/unit/lib/google/recording-detector.test.ts` — encontra gravação por nome, move para pasta correta, não duplica se já detectado

### Frontend

- `src/components/meetings/RecordingPlayer.tsx` — player simples:
  - Thumbnail com botão play
  - Abre o arquivo do Drive em modal ou nova aba (Drive tem player nativo de MP4)
  - Duração e data da gravação

### Critérios de teste (Fase 5)
- [ ] Após gravar reunião no Meet, gravação aparece no perfil do Lead em até 15 min
- [ ] Botão "▶ Assistir" abre o vídeo no Google Drive
- [ ] Arquivo movido para `WB-CRM/Reuniões/[Entidade]/` (organizado)
- [ ] Status da reunião atualizado para "done"

---

## Fase 6 — Transcrição de reuniões

**Objetivo**: texto completo da reunião disponível no perfil da entidade para busca e análise.

### Análise: Google Workspace fornece transcrição?

| Plano | Gravação | Transcrição automática |
|---|---|---|
| Business Starter | ❌ | ❌ |
| Business Standard | ✅ | ❌ |
| Business Plus | ✅ | ✅ (arquivo .docx no Drive) |
| Enterprise | ✅ | ✅ |

**Plano atual: Business Standard** → sem transcrição nativa. Usar sistema Whisper (mesmo pipeline pendente para GoTo e WhatsApp). Transcrição Google seria disponível a partir do Business Plus.

### Backend (TDD)

**Opção A — Transcrição Google nativa:**
- `src/lib/google/transcript-detector.ts` — busca arquivo `.docx` da transcrição no Drive após a reunião, lê o texto, salva em `Meeting.transcriptText`

**Opção B — Whisper (fallback):**
- Baixar o `.mp4` da gravação do Drive
- Enviar para API Whisper existente (mesmo endpoint já usado para GoTo/WhatsApp futuro)
- Salvar texto retornado em `Meeting.transcriptText`
- Upload do `.txt` da transcrição para `WB-CRM/Reuniões/[Entidade]/`

**Implementar os dois**: tentar Google primeiro, usar Whisper como fallback.

**Testes unitários:**
- `tests/unit/lib/google/transcript-detector.test.ts` — encontra .docx junto com .mp4, extrai texto corretamente

### Frontend

- Seção "Transcrição" no detalhe da reunião (abaixo do player):
  - Texto completo formatado por parágrafo/falante (quando disponível)
  - Badge "Transcrição Google" ou "Transcrição Whisper"
  - Botão "Copiar transcrição"
  - Campo de busca dentro da transcrição (client-side)

### Critérios de teste (Fase 6)
- [ ] Transcrição aparece no perfil do Lead após reunião encerrada
- [ ] Texto correto com identificação de falantes (se Google) ou contínuo (se Whisper)
- [ ] Busca por palavra dentro da transcrição funciona
- [ ] Arquivo .txt salvo no Drive junto à gravação

---

## Dependências entre fases

```
Fase 0 (OAuth) ──► Fase 1 (Gmail envio)
                ──► Fase 2 (Gmail recebimento)  ← depende de Fase 1
                ──► Fase 3 (Drive + Propostas)
                ──► Fase 4 (Meet agendamento)
                        └──► Fase 5 (Gravações)  ← depende de Fase 3 (Drive)
                                 └──► Fase 6 (Transcrição)
```

---

## Pacotes npm necessários

```bash
npm install googleapis google-auth-library
```

- `googleapis` — cliente oficial para todas as APIs Google (Gmail, Drive, Calendar)
- `google-auth-library` — OAuth2 client e gestão de tokens

---

## Status das fases

| Fase | Descrição | Status |
|---|---|---|
| 0 | OAuth2: conectar conta Google + painel admin | ✅ Concluída |
| 1 | Gmail: envio de e-mail com Activity | ✅ Concluída |
| 1a | Gmail: editor de texto rico (bold, italic, listas, links, tamanho, alinhamento) | ✅ Concluída |
| 1b | Gmail: anexos no compose (multipart/mixed, validação de tamanho, Nginx 25 MB) | ✅ Concluída |
| 1c | Gmail: templates com variáveis dinâmicas (`/admin/gmail-templates`) | ✅ Concluída |
| 1c-fix | Gmail: crash ao abrir modal (useSession sem SessionProvider → senderName prop) | ✅ Concluída |
| 2 | Gmail: recebimento automático via polling + vínculo LeadContact | ✅ Concluída |
| 2a | Gmail: reply a e-mails recebidos (com threadId) | ✅ Concluída |
| 2b | Gmail: indicador visual "aguardando resposta" / "respondido" / "resposta enviada" | ✅ Concluída |
| 2c | Gmail: sincronização manual (botão Sync em Lead e Organization) | ✅ Concluída |
| 2d | Gmail: thread connector visual entre cards da mesma cadeia de respostas | ✅ Concluída |
| 2e | Gmail: busca + filtros de atividades (tipo, status, texto) | ✅ Concluída |
| 2f | Gmail: ordenação — pendentes por drag-and-drop; concluídas/falhas/puladas por data de resolução | ✅ Concluída |
| 3 | Drive: estrutura de pastas + Propostas para Leads/Deals + viewer (PDF/Office) | ✅ Concluída |
| 4 | Meet: agendamento de reuniões com convite | 🔲 Pendente |
| 5 | Meet: gravações detectadas e exibidas no perfil | 🔲 Pendente |
| 6 | Transcrição: Google nativo (Business Plus) ou Whisper | 🔲 Pendente |
