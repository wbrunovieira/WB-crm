# Plano — App móvel de prospecção porta a porta (React Native)

**Objetivo:** um app simples para o time cadastrar leads em campo (porta a porta), na hora
em que entra na loja, com o mínimo de digitação. Reaproveita ao máximo a API NestJS que já
existe (`crm-api.wbdigitalsolutions.com`); só duas capacidades novas de backend são
necessárias (OCR de cartão e reverse-geocode).

Status: proposta para aprovação. Datas relativas convertidas na conclusão.

---

## 1. Princípios

- **Rápido em campo:** 2–4 toques para cadastrar um lead + registrar a visita. Nada de
  formulário longo obrigatório.
- **Reusar o backend:** o app é só um cliente REST autenticado por JWT, igual ao frontend
  web. Nenhuma regra de negócio nova no app.
- **Funciona com internet ruim:** loja/rua tem sinal instável → capturar offline e
  sincronizar depois (fila local).
- **Um lead sempre vira uma atividade:** todo cadastro em campo cria também a atividade
  `physical_visit` ("prospecção porta a porta"), para o funil registrar a visita.

---

## 2. Os 4 modos de captura (fluxos)

Tela inicial "Cadastrar lead" com 4 caminhos:

### A) Buscar no Google Meus Negócios (recomendado como principal)
Espelha o modal web `src/components/leads/LeadGooglePlacesLinkModal.tsx`.
1. Campo de busca (texto livre, ex.: "padaria centro Teresópolis") → `POST /leads/google-places/search`.
2. Lista de resultados (nome, endereço, telefone, ⭐). Paginação com `nextPageToken`.
3. Ao escolher: `GET /leads/check-google-id?googleId=<placeId>` para evitar duplicado.
   - Se já existe → abrir o lead existente e só criar a atividade de visita.
   - Se novo → `POST /leads` com os campos do place (mesmo mapa da UI/skill `crm-bot-api`).
4. Cria a atividade `physical_visit` com opção de **observações adicionais** (o que achou na loja).

### B) Foto de cartão de visita / panfleto → transcrever (capacidade nova)
1. Tirar foto (câmera) ou escolher da galeria.
2. Enviar a imagem para o **novo endpoint** `POST /leads/transcribe-card` (visão/OCR).
3. Backend retorna campos estruturados (nome da empresa, pessoa, telefone, whatsapp, e-mail,
   site, endereço, cargo…) → app **pré-preenche** o formulário.
4. Usuário confere/ajusta → `POST /leads` (+ contato) + atividade `physical_visit`.

### C) Cadastro manual com endereço por GPS
1. Botão "Usar minha localização" → `expo-location` pega lat/long.
2. Reverse-geocode → **auto-preenche** endereço, bairro, cidade, UF, CEP (todos **editáveis**).
3. Usuário preenche nome/telefone → `POST /leads` + atividade.

### D) Cadastro manual simples
Formulário enxuto (só `businessName` obrigatório) + atividade. Fallback quando nada acima serve.

Todos os 4 terminam no mesmo **resumo de confirmação** → salvar → toast → volta pra tela inicial.

---

## 3. Arquitetura

- **Framework:** **Expo (managed)** + React Native + TypeScript. Motivo: câmera, GPS,
  secure-store e build (EAS) prontos, sem mexer em Xcode/Gradle; OTA updates. Bare RN só se
  aparecer necessidade nativa que o Expo não cubra (não é o caso aqui).
- **Onde mora o código:** novo diretório **`/mobile`** no monorepo (mesmo repo), com seu
  próprio `package.json` e pipeline EAS. Mantém a API e o app versionados juntos.
- **Autenticação (decisão 2026-08-03 — uso pessoal, SEM tela de login):** o app usa um **JWT
  de longa duração (365d) embutido de forma segura**. O token fica num `/mobile/.env`
  **gitignorado** (repo é público → nunca commitar), é injetado via `app.config.ts` → `extra`,
  e no primeiro launch é copiado para o **Keychain** (`expo-secure-store`); daí em diante o app
  lê do Keychain e anexa `Authorization: Bearer <jwt>`. Cunhado dentro do container prod
  (assinado com `JWT_SECRET`, para o usuário admin `bruno@wbdigitalsolutions.com`). Ao 401
  (token expirado/rotacionado), regenerar o token e atualizar o `.env` (sem fluxo de refresh no v1).
- **Cliente de API:** wrapper `apiFetch(path, opts)` idêntico em espírito ao do web, apontando
  para `https://crm-api.wbdigitalsolutions.com`. **Mobile não envia Origin → CORS não se
  aplica** (o allowlist atual do backend não bloqueia o app).
- **Estado/dados:** React Query (cache, retry, mutations) + Zustand/Context para sessão.
- **Offline (importante p/ campo):**
  - Fila de mutations pendentes persistida (AsyncStorage/MMKV): cada "cadastrar lead+atividade"
    e cada foto ficam numa fila e são reenviados quando a conexão volta (`@react-native-community/netinfo`).
  - Busca do Google Places exige internet (não dá pra cachear) → se offline, cair no modo C/D.
  - Indicador visual de "N cadastros pendentes de sincronização".

---

## 4. Trabalho novo no backend (mínimo)

| # | Item | Detalhe |
|---|------|---------|
| 1 | OCR do cartão (**grátis** — ver §4.1) | **On-device** (nenhum endpoint pago). O parsing estruturado opcional roda por trás de um `POST /leads/structure-card-text` que chama o **Gemini free tier**. Não persiste imagem. |
| 2 | `POST /leads/reverse-geocode` | Recebe `{lat,long}` → proxy do Google Geocoding usando a chave **no servidor** (`GOOGLE_PLACES_API_KEY` ou key de geocoding) → devolve `{address,neighborhood,city,state,zipCode,country}`. Evita expor a key no app. Rate-limit. |
| 3 | (opcional) `POST /leads/quick-field-capture` | Endpoint combinado que cria lead + atividade `physical_visit` numa transação, pra reduzir round-trips/erros parciais no campo. **Alternativa sem backend novo:** o app faz `POST /leads` e depois `POST /activities` (2 chamadas) — aceitável no MVP. |

### 4.1 OCR do cartão sem verba (decisão: modelos gratuitos)

Estratégia em duas camadas, ambas sem custo:

1. **Extração de texto on-device (baseline, 100% grátis, offline, sem API key):**
   **Google ML Kit — Text Recognition** via `@react-native-ml-kit/text-recognition`
   (exige **dev build** do Expo, não Expo Go — já usamos EAS). A foto **nunca sai do
   aparelho** para o OCR básico (ganho de privacidade). Retorna blocos de texto.
2. **Estruturar em campos:**
   - **Camada A (grátis, offline):** heurística no app — regex para e-mail, telefone
     (→ E.164), site/URL; e o restante (nome da empresa, pessoa, cargo) inferido pela
     posição/maior fonte dos blocos do ML Kit. Suficiente para pré-preencher e o usuário ajustar.
   - **Camada B (opcional, grátis com limite):** enviar **só o texto** (não a imagem) ao
     backend `POST /leads/structure-card-text` → **Google Gemini free tier**
     (API key do AI Studio, sem cobrança dentro dos limites; ~15 req/min / cota diária —
     ok para um time de campo pequeno) → JSON com os campos. Atrás de uma flag; se estourar
     a cota, cai na Camada A automaticamente. **Zero custo pago.** (Trocável por Claude
     vision no futuro, se houver verba.)

Nada de `ANTHROPIC_API_KEY` no v1. O único segredo novo (opcional) é a key gratuita do Gemini.

Tudo o mais **já existe** e é reutilizado (seção 5).

---

## 5. Endpoints existentes reutilizados

| Ação | Endpoint | Observação |
|------|----------|-----------|
| Login | `POST /auth/login` | retorna JWT + user |
| Buscar empresas | `POST /leads/google-places/search` | `{textQuery, pageToken?, languageCode?}`; 429 traz `retryAfterSeconds` |
| Anti-duplicado | `GET /leads/check-google-id?googleId=` | `{exists}` (`Lead.googleId` é único) |
| Criar lead | `POST /leads` | só `businessName` obrigatório; mapa Place→Lead igual à UI |
| Criar atividade | `POST /activities` | `type:"physical_visit"`, `subject` obrigatório, `leadId`, `description` (observações), `completed:true` |
| (rastro de busca) | `POST /leads/google-places-searches/find-or-create` · `PATCH /.../:id` | opcional, p/ registrar o lote de prospecção |
| Segmentos/listas | `GET /leads/source-groups` | p/ escolher/etiquetar o lote |

Convenções (memória/skill `crm-bot-api`): **`isProspect:false`** (aparece direto em `/leads`),
telefones em **E.164**, `source:"door_to_door"` (novo valor) ou `"google_places"`,
`sourceGroup:"porta-a-porta-<cidade>-<data>"` para agrupar a saída de campo.

---

## 6. Telas (v1)

1. **Login** (email/senha).
2. **Home / "Cadastrar lead"** — 4 botões grandes (A/B/C/D) + contador de pendências de sync.
3. **Busca Google** — input + lista de resultados + paginação.
4. **Câmera/Cartão** — capturar/escolher foto → loading de transcrição → revisão.
5. **Formulário do lead** — enxuto, pré-preenchido conforme o modo; botão "Usar GPS".
6. **Atividade de visita** — subject padrão "Prospecção porta a porta", campo de observações,
   (opcional) foto da fachada.
7. **Confirmação/resumo** → salvar.
8. **Meus cadastros de hoje** — lista do que foi cadastrado na sessão + status de sync.

---

## 7. Stack / bibliotecas

- `expo`, `expo-router` (navegação), `expo-secure-store` (JWT), `expo-location` (GPS),
  `expo-camera` / `expo-image-picker` (foto), `expo-image-manipulator` (comprimir antes de subir),
  `@tanstack/react-query`, `@react-native-community/netinfo` (offline), `zod` (validação, reusar
  os schemas de lead onde fizer sentido), `date-fns`.
- Build/dist: **EAS Build** (dev/internal). **Sem publicar nas lojas** (decisão) — distribuição
  interna: dev build no **simulador iOS (iPhone 12 Pro)** para desenvolvimento e, para os
  celulares do time, build interna Android (APK) / iOS ad-hoc. O Expo gera as duas plataformas
  do mesmo código de qualquer forma. OTA via EAS Update.

---

## 8. Segurança & privacidade

- JWT em secure-store; logout limpa o storage. Tela travada atrás do login.
- Imagens de cartão: enviar por HTTPS, **não** persistir a imagem no backend (só a transcrição);
  descartar do device após sync.
- Permissões runtime (câmera, localização) com textos de justificativa (pt-BR).
- Rate-limit nos 2 endpoints novos (OCR e geocode) — custam dinheiro (visão + Google).
- Role: usuário de campo é `sdr`; vê/edita os próprios leads (isolamento por `ownerId` já
  garantido no backend).

---

## 9. Fases / entregáveis

- **Fase 0 — Fundação (app roda + autentica):** Expo em `/mobile`, login `POST /auth/login`,
  storage do JWT, apiClient, navegação, tela Home. Rodando no device via Expo Go/EAS dev.
- **Fase 1 — Modo A (Google Places) + atividade:** o fluxo principal ponta a ponta
  (buscar → check-google-id → POST /leads → POST /activities). Já entrega valor real em campo.
- **Fase 2 — Modo C (GPS) + Modo D (manual):** `POST /leads/reverse-geocode` (backend novo #2)
  + `expo-location`; formulário enxuto.
- **Fase 3 — Modo B (OCR de cartão):** `POST /leads/transcribe-card` (backend novo #1, TDD) +
  câmera + tela de revisão.
- **Fase 4 — Offline/robustez:** fila de sync, netinfo, contador de pendências, retries.
- **Fase 5 — Polimento & distribuição:** "meus cadastros do dia", foto da fachada na atividade,
  EAS Build interno (iOS/Android), ícone/splash.

Cada fase do backend novo segue **TDD** e **review sênior** antes de seguir (feedbacks do projeto).
Deploy do backend pelo fluxo normal (CI/CD → `deploy-backend.yml` quando houver migração/rota nova).

---

## 10. Decisões tomadas (2026-08-03)

1. **Plataforma:** desenvolvimento no **simulador iOS (iPhone 12 Pro)**; Expo gera iOS+Android
   do mesmo código; **sem publicar nas lojas** (distribuição interna).
2. **OCR do cartão:** **modelos gratuitos** (sem verba) — ML Kit on-device + heurística, com
   Gemini free tier opcional para estruturar (ver §4.1). Nada pago; sem `ANTHROPIC_API_KEY`.
3. **Onde mora o código:** **`/mobile` neste repo** (monorepo).
4. **Modo principal:** **Google Meus Negócios** como caminho padrão da Home; os outros como alternativas.
5. **Escopo do v1:** **tudo** — Google Places + atividade + GPS + manual + **OCR** + **offline**
   (Fases 0–5). Entrega mais completa desde o primeiro corte.

## 11. Próximo passo
Criar as issues das Fases 0–5 no board WB CRM (uma por fase) e começar pela **Fase 0**
(fundação do Expo em `/mobile` + login). Backend novo (reverse-geocode, structure-card-text)
segue TDD + review sênior; deploy pelo fluxo CI/CD normal.
