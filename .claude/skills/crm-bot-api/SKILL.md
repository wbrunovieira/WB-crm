---
name: crm-bot-api
description: Como um BOT/agente externo consome a API do WB-crm — autenticar (JWT), pesquisar empresas no Google Meu Negócio (Places), criar/consultar/editar leads, criar atividades e registrar seu trabalho no CRM. Use sempre que precisar dar acesso de API a um bot, gerar/renovar token, ou lembrar dos endpoints e formatos (leads, activities, google-places). Base: https://api.crm.wbdigitalsolutions.com.
---

# WB-crm API para bots/agentes externos

O backend NestJS (`https://api.crm.wbdigitalsolutions.com`, container `wb-crm-backend`:3010 no servidor `45.90.123.190`) expõe REST protegido por **JWT Bearer**. Um bot autentica com um token e usa os mesmos endpoints da UI.

## Autenticação (CRÍTICO)
- O guard valida com **`process.env.JWT_SECRET`** do backend — **NÃO** é o `NEXTAUTH_SECRET` (são valores diferentes em prod). Assine o token com `JWT_SECRET`.
- Header em toda chamada: `Authorization: Bearer <token>`.
- Claims: `{ sub: <userId>, email, role: "admin"|"sdr", name }`. `ownerId` dos registros = `sub`.
- **Isolamento**: `admin` vê/edita tudo; `sdr` só vê os próprios (+ compartilhados). Bot de prospecção que precisa ler/editar qualquer lead → role `admin`.

**Cunhar token (dentro do container, usa o secret de lá — não precisa exfiltrar):**
```bash
ssh root@45.90.123.190 'docker exec wb-crm-backend node -e "console.log(require(\"jsonwebtoken\").sign({sub:\"<USERID>\",email:\"bot@wbdigitalsolutions.com\",role:\"admin\",name:\"Bot Prospector\"},process.env.JWT_SECRET,{expiresIn:\"365d\"}))"'
```
**Usuário-bot dedicado** (criar uma vez; `password` inválido = login por senha impossível, só JWT):
```sql
INSERT INTO users (id,name,email,password,role,"createdAt","updatedAt")
VALUES (gen_random_uuid()::text,'Bot Prospector','bot@wbdigitalsolutions.com','LOGIN_DISABLED','admin',now(),now())
ON CONFLICT (email) DO UPDATE SET role='admin' RETURNING id;
```
> Bot atual já criado: `bot@wbdigitalsolutions.com` / id `c3998450-9d4b-4319-9357-1acc0d6d7196` (admin). Token expira em ~1 ano — re-cunhar com o comando acima.

## Pesquisar empresas no Google Meu Negócio (Places)
Backend usa Google Places Text Search v1 (`places:searchText`, env `GOOGLE_PLACES_API_KEY`). Bot **não** chama o Google direto — chama o CRM:

`POST /leads/google-places/search`  body `{ "textQuery":"restaurante em Teresópolis RJ", "pageToken"?, "languageCode"? ("pt-BR") }`
→ `{ "places":[ { placeId, businessName, address, city, state, zipCode, country, neighborhood, phone, internationalPhone, website, rating, userRatingCount, priceLevel(0-4), businessStatus, types[], primaryType, description, latitude, longitude, googleMapsUrl, openingHours } ], "nextPageToken"? }`
(HTTP 429 = rate limit → body traz `retryAfterSeconds`; paginar com `nextPageToken`.)

Evitar duplicado antes de importar: `GET /leads/check-google-id?googleId=<placeId>` → `{ "exists": boolean }` (campo `Lead.googleId` é único).

(Opcional, p/ rastrear lote de busca: `POST /leads/google-places-searches/find-or-create` `{country,city?,zipCode?,typeKeyword,searchQuery}` → profile; e `PATCH /leads/google-places-searches/:id` `{fetchedPlaceIds,newlySeenCount,importedCount}`.)

## Criar lead (a partir de um place ou manual)
`POST /leads` — **único obrigatório: `businessName`**. Mapa Place→Lead (igual à UI):
```json
{ "googleId":"<placeId>", "businessName":"...", "address":"...", "city":"...", "state":"...",
  "zipCode":"...", "country":"...", "vicinity":"<neighborhood>", "phone":"...", "whatsapp":"<internationalPhone>",
  "website":"...", "rating":4.5, "userRatingsTotal":120, "priceLevel":2, "businessStatus":"OPERATIONAL",
  "types":"<JSON string de types[]>", "categories":"<primaryType>", "description":"...",
  "latitude":-22.4, "longitude":-42.9, "googleMapsUrl":"...", "openingHours":"<JSON string>",
  "source":"google_places", "searchTerm":"<query>", "isProspect":false,
  "contacts":[{ "name":"...", "email":"...", "phone":"...", "whatsapp":"...", "role":"...", "isPrimary":true }] }
```
Telefones devem ser E.164 (+55…) — ver memória phone E.164. `ownerId` é setado pelo token (não enviar).

> ⚠️ **`isProspect: false`** (convenção, definida 2026-06-27). A lista principal `/leads` mostra só `isProspect=false`; `isProspect=true` cai na aba **Prospects** (`/leads/prospects`), que o time não acompanha no dia a dia. Como o bot já investiga/qualifica antes de cadastrar, mande `false` pra o lead aparecer direto em `/leads`. (A UI de import do Google marca `true`, mas pro bot use `false`.)

## Consultar / editar leads
- `GET /leads?search=&status=&quality=&sourceGroup=&page=1&pageSize=50&sortBy=&sortDir=` → `{leads,total,page,pageSize}` (pageSize máx 200).
- `GET /leads/:id` → detalhe completo (contatos, atividades, CNAEs, tech profile).
- `PATCH /leads/:id` → qualquer campo (todos opcionais). `labelIds` substitui labels; `icpId:null` remove.
- `GET /leads/source-groups` → grupos de importação. `PATCH /leads/:id/archive` `{reason?}` / `/unarchive` / `/qualify`.

## Contatos do lead
- `GET /leads/:id/contacts` · `POST /leads/:id/contacts` `{name(req),role?,email?,phone?,whatsapp?,linkedin?,instagram?,isPrimary?,languages?}` · `PATCH /leads/:id/contacts/:contactId` · `DELETE …`.

## ICP (Perfil de Cliente Ideal)
Criar/consultar ICP e marcar o fit do lead: `POST /icps` (`{name,content,status}`), `GET /icps`, e vincular `POST /icps/leads/:leadId/:icpId` (ou `icpId` no `POST /leads`). Detalhes e campos de qualificação na skill **`crm-icp`**.

## Registrar atividades (o trabalho do bot)
`POST /activities` — **obrigatórios: `type`, `subject`**. Demais opcionais:
```json
{ "type":"call|email|whatsapp|task|meeting|instagram_dm", "subject":"...", "description":"...",
  "dueDate":"<ISO>", "leadId":"<id>", "leadContactIds":["..."], "contactIds":["..."],
  "completed":false, "completedAt":"<ISO>", "remindAt":"<ISO p/ lembrete no sino>",
  "callContactType":"gatekeeper|decisor" }
```
Listar/atualizar: `GET /activities?type=&leadId=&completed=&dateFrom=&dateTo=` · `PATCH /activities/:id` · `PATCH /activities/:id/toggle-completed` · `/fail` `{reason}` · `/skip` `{reason}`. Lembrete "notificar-me" cai no sino (ver [[project_current_state]]).

## Receita típica do bot prospector
1. `POST /leads/google-places/search` (paginar com `nextPageToken`).
2. p/ cada place: `GET /leads/check-google-id` → se não existe, `POST /leads` (com `source:"google_places"`, **`isProspect:false`**, `sourceGroup:"<lote>"`).
3. trabalhar o lead → `POST /activities` (registrar cada ligação/email/WhatsApp), usar `remindAt` p/ follow-up.
4. atualizar status/qualidade via `PATCH /leads/:id`.

WhatsApp (enviar/receber) é outra integração — ver skill `integrations` e [[reference_evolution_api]]. Boas práticas de prospecção: [[feedback_prospect_no_agencies]], [[feedback_investigate_each_lead]], [[feedback_prospect_data_quality]].
