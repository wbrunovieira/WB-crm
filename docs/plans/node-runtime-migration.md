# Plano: Migração do runtime Node (20 → 22 LTS)

**Data de Criação:** 2026-07-06
**Status:** Em andamento (2026-07-16) — **Fase 0 implementada** (Dockerfile `node:22-alpine`, CI `NODE_VERSION=22`, `engines: >=22`, `.nvmrc`); gate = CI verde no Node 22. Alvo escolhido: **Node 22 LTS**. Falta: Fase 1 (deploy backend → container no 22, automático no próximo quick-deploy que rebuilda a imagem), Fase 2 (host `/usr/bin/node` 20→22, manual/sistêmico), Fase 3 (consolidação).
**Prioridade:** Média-alta — Node 20 entrou em **EOL em 30/abr/2026**; produção está sem patches de segurança do runtime desde então
**Origem:** Follow-up do audit de CI/CD (2026-07-06). O nit das actions (`checkout`/`setup-node` mirando Node 20) **já foi resolvido** com o bump pra `@v5`; este plano cobre o item maior e separado: o **runtime de produção**.

---

## 1. Problema

Produção roda **Node `v20.20.2`** no frontend e no backend. O **Node 20 saiu de suporte (EOL) em 30/abr/2026** — não recebe mais correções de segurança nem bugfixes. Continua funcionando, mas é dívida de segurança/operação que só cresce.

Escopo confirmado no servidor (`45.90.123.190`) em 2026-07-06:

| Componente | Como o Node é provido hoje | Migração | Isolamento |
|---|---|---|---|
| **Backend (NestJS)** | container Docker `wb-crm-backend`, `backend/Dockerfile` → `FROM node:20-alpine` (builder + runtime) | trocar base image → `node:22-alpine` + rebuild | ✅ Total (dentro do container) |
| **Frontend (Next.js)** | Node do **sistema** em `/usr/bin/node` (root, via apt/NodeSource — **sem nvm**); PM2 `wb-crm` usa esse interpretador | atualizar o pacote NodeSource 20.x → 22.x + `pm2 restart` | ⚠️ Sistêmico (afeta tudo que usa `/usr/bin/node`) |
| **CI** | `.github/workflows/ci.yml` → `NODE_VERSION: "20"` (usado nos 4 jobs) | bumpar para `"22"` | ✅ Só o runner |
| **Actions runtime** | `checkout`/`setup-node` (runtime interno Node 20) | ✅ **JÁ FEITO** — bump pra `@v5` (2026-07-06, local) | — |

### Fatos que barateiam a migração
- **Backend é trivial e isolado:** é só a base image do container. Nenhum efeito colateral fora dele; sobe pelo fluxo `deploy-backend.yml` (backup → build → swap) com rollback pronto.
- **Frontend e n8n usam Nodes diferentes:** o frontend usa `/usr/bin/node`; o n8n usa `/usr/local/bin/node`. Atualizar o `/usr/bin/node` **não** mexe no n8n. Ainda assim, é uma mudança sistêmica — validar que nada mais no host depende de `/usr/bin/node`.
- **Compatibilidade dos frameworks OK:** Next.js 14.2.35 suporta Node `^18.17 || >=20` (roda em 22); NestJS 11 exige Node `>= 20` (roda em 22). Nenhum bloqueio de framework.

---

## 2. Alvo: Node 22 LTS ("Jod")

- **Node 22 LTS** — manutenção até **abr/2027**. Alvo conservador e amplamente testado; suportado explicitamente por Next 14.2 e Nest 11. **Recomendado.**
- **Node 24 LTS** ("Krypton") — manutenção até **abr/2028** (mais fôlego). Opção se quiser validar uma vez e não repetir a migração tão cedo. Requer teste extra (matriz mais nova).

> Decisão default deste plano: **Node 22 LTS**. Trocar por 24 se preferir runway maior — o roteiro é o mesmo, só muda o número.

---

## 3. Fases

Fazer **backend primeiro** (isolado, reversível) e só então o frontend (sistêmico). Os dois são independentes — dá pra parar entre as fases sem inconsistência.

### Fase 0 — Preparação (repo, sem deploy)
1. `backend/Dockerfile`: `FROM node:20-alpine` → `FROM node:22-alpine` (nos **dois** estágios: `builder` e `runtime`).
2. `.github/workflows/ci.yml`: `NODE_VERSION: "20"` → `"22"`.
3. Declarar a versão esperada (hoje **não há** `engines` em nenhum `package.json`):
   - `package.json` e `backend/package.json`: `"engines": { "node": ">=22 <23" }`.
   - Adicionar `.nvmrc` (raiz e `backend/`) com `22` — documenta a versão local esperada.
4. Push → **CI verde no Node 22** é o gate. Se algum teste/build quebrar no 22, resolver **antes** de tocar em produção. (É exatamente pra isso que o CI testa no mesmo Node do prod.)

### Fase 1 — Backend em produção (container, isolado)
1. Deploy pelo fluxo do backend: `deploy-backend.yml` (backup do banco → build da nova imagem `node:22-alpine` → swap do container). Como não há migração de schema, o `migrate deploy` é no-op — o valor aqui é o **swap com backup e rollback prontos**.
2. Validar: `docker exec wb-crm-backend node -v` → `v22.x`; health `GET https://api.crm.wbdigitalsolutions.com/health` → 200; smoke nos fluxos críticos (auth, uma listagem, um cron manual).
3. **Rollback:** re-deploy da imagem anterior (o swap guarda a imagem antiga) ou `rollback.yml`.

### Fase 2 — Frontend em produção (system Node, sistêmico)
1. **Janela de manutenção curta** (o `/usr/bin/node` é substituído; o PM2 precisa reiniciar).
2. Atualizar o repositório NodeSource para 22.x e `apt-get install -y nodejs` (substitui `/usr/bin/node`). Confirmar `node -v` → `v22.x`.
3. `cd /opt/wb-crm && npm ci --production=false && npm run build` com o Node 22 (rebuild limpo — o `.next` foi compilado no 20).
4. `sudo pm2 restart wb-crm && pm2 status` → validar `exec_interpreter` e health `https://crm.wbdigitalsolutions.com` (302/307 = ok).
5. **Rollback:** reinstalar o pacote NodeSource 20.x + `pm2 restart`. Ter o comando pronto **antes** de começar.

### Fase 3 — Consolidação
1. Confirmar que o `quick-deploy.yml` (que roda `npm ci`/`build` no host) continua verde no Node 22 — primeiro deploy normal pós-migração é o teste real.
2. Atualizar `CLAUDE.md` (menção a versões) e a memória de referência se necessário.
3. (Opcional) Planejar o mesmo para o Node do n8n (`/usr/local/bin/node`) — **fora do escopo** deste plano, mas é a próxima dívida de runtime do host.

---

## 4. Riscos e mitigação

| Risco | Prob. | Mitigação |
|---|---|---|
| Frontend `/usr/bin/node` é usado por outro serviço do host | Baixa | `grep`/`lsof` antes; n8n já usa `/usr/local/bin/node` (desacoplado) |
| Build do Next 14 diverge no Node 22 | Baixa | CI da Fase 0 pega antes de tocar em prod |
| Dependência nativa recompila diferente (node-gyp) no 22 | Baixa | `npm ci` limpo na Fase 1/2; backend valida no container primeiro |
| Janela de indisponibilidade do frontend | Média | Fase 2 em janela curta; rebuild antes do restart; rollback pronto |

---

## 5. Checklist

- [ ] Fase 0: `Dockerfile` (2 estágios) + `NODE_VERSION` + `engines` + `.nvmrc` → **CI verde no 22**
- [ ] Fase 1: deploy backend (`deploy-backend.yml`) → `node -v` v22 no container + health 200
- [ ] Fase 2: NodeSource 22.x no host → rebuild → `pm2 restart` → front 302/307
- [ ] Fase 3: primeiro `quick-deploy` normal verde + docs atualizadas
- [ ] (Opcional) avaliar Node 24 no lugar de 22 para runway até 2028
- [ ] (Fora de escopo) migração do Node do n8n (`/usr/local/bin/node`)

---

## 6. Referências

- Workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Backend base image: `backend/Dockerfile`
- Playbooks: `deploy/ansible/playbooks/{quick-deploy,deploy-backend,rollback}.yml`
- Skill `deploy` (fluxo CI/CD + fallback manual + rollback)
- Estado confirmado em prod (2026-07-06): front `/usr/bin/node` v20.20.2 · backend container v20.20.2
