---
name: deploy
description: Como fazer deploy do WB-CRM em produção (Contabo 45.90.123.190). O fluxo padrão é CI/CD via GitHub Actions — push na main → testes (CI) → aprovação manual no GitHub → deploy via Ansible (frontend PM2 + backend Docker). Use sempre que o usuário pedir para "fazer deploy", "subir pra produção", "deployar", perguntar como funciona o deploy/CD, precisar do fallback manual de Ansible, fazer rollback, ou debugar um deploy travado. Cobre também a detecção automática de migrations e o gotcha do pager que travava o CD.
---

# Deploy do WB-CRM (produção: Contabo `45.90.123.190`)

O deploy padrão é **CI/CD via GitHub Actions**. Você **não roda Ansible na mão** no dia a dia —
o GitHub Actions executa o Ansible por você. Ansible manual fica só como fallback/rollback.

## Fluxo padrão (o que acontece a cada push na `main`)

```
git push (main)  →  CI (testes)  →  se verde: CD dispara  →  aprovação MANUAL no GitHub  →  deploy no Contabo
```

1. **Push na `main`** dispara o workflow **CI** (`.github/workflows/ci.yml`):
   frontend (lint + unit Vitest + build), backend (build + unit), backend E2E (Postgres real),
   frontend E2E (Playwright). Se **qualquer** job falhar, o CD **não** começa.
2. Com o CI **verde**, o **CD** (`.github/workflows/deploy.yml`) dispara via `workflow_run`
   (só na `main`, nunca em PR) e fica **`waiting`** no gate do environment `production`.
3. O usuário **aprova** em `https://github.com/wbrunovieira/WB-crm/actions` → "Review deployments" → Approve.
4. O CD roda o Ansible contra o Contabo como o usuário **não-root `deploy`** (chave dedicada,
   host key pinada em `deploy/ci/known_hosts`, sudo escopado só a `pm2 restart/status` e ao backup).
   Faz frontend (PM2) + backend (container Docker) + health checks.

> Deploy normal leva **~5 min**. Se passar de ~10 min, algo travou (ver "Debug" abaixo).

### Migrations são automáticas
O CD detecta se o diff (commit deployado no servidor → `main`) toca `backend/prisma/migrations/`:
- **Tocou** → roda `deploy-backend.yml` (backup do banco → `prisma migrate deploy` → swap do container)
  **antes** do quick-deploy. Código novo nunca sobe sem a coluna existir.
- **Não tocou** → só `quick-deploy.yml` (git pull + build + restart, sem migração).

Ou seja: **mudança de schema também sobe sozinha**, com backup antes. Nunca use `db:push` em prod.

## Como disparar

- **Automático:** `git push` na `main` (o jeito normal). Depois **aprove no GitHub**.
- **Manual pelo GitHub (sem push novo):** Actions → workflow **CD** → "Run workflow" →
  input `playbook`: `auto` (detecta migrations) | `quick-deploy` | `deploy-backend`. Ainda exige aprovação.
- Comando: `gh workflow run deploy.yml -f playbook=auto` e depois aprovar.

## Acompanhar um run

```bash
gh run list --workflow=deploy.yml --limit 3
gh run view <run-id>                 # steps
gh run watch <run-id> --exit-status  # espera terminar (usar o RUN id, não o job id)
```
Health de prod: front `curl -s -o /dev/null -w '%{http_code}' https://crm.wbdigitalsolutions.com`
(302/307 = ok, redireciona pro login); back `.../api/... ` via `https://crm-api.wbdigitalsolutions.com`.

## Fallback manual (Ansible direto do seu terminal)

Só quando precisar contornar o CD. Roda como **root** (o `ansible.cfg` do repo tem `become=True`):
```bash
cd deploy/ansible
# Código, sem migração de schema (frontend + backend):
ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml
# Backend COM migração (backup → prisma migrate deploy → swap):
ansible-playbook -i inventory/production.yml playbooks/deploy-backend.yml
```

## Rollback (sempre manual — não está ligado ao CD)

```bash
cd deploy/ansible
ansible-playbook -i inventory/production.yml playbooks/rollback.yml \
  -e "backup_file=pre_migration_XXXXXXXX_XXXXXX.sql"
```

## Debug: deploy travado (o gotcha do pager)

Se o CD travar silenciosamente e só morrer no teto de 30 min do job, o suspeito nº 1 é
**git abrindo um pager**: o módulo `raw` do Ansible aloca um **PTY**, então um `git log`
sem `--no-pager` canaliza a saída pelo pager (`less`), que bloqueia esperando input.
Já corrigido nos playbooks (`git --no-pager log`), mas a regra vale pra qualquer git novo:
**todo git que pode paginar (log/diff/show/branch/tag) rodando via `raw` precisa de `--no-pager`.**
Diagnóstico ao vivo e detalhes: ver a memória `reference_ansible_git_pager_hang`.

Diagnosticar um run preso (com acesso SSH root ao servidor):
```bash
# procurar o processo do deploy preso (usuário deploy)
ps -u deploy -o pid,etimes,stat,wchan:20,cmd | grep -E 'git|npm|node'
# sinal do bug do pager: git em 'Ss+' / wchan=do_wait, com filho /usr/bin/pager em pts/0
# destravar um run preso: kill <pid-do-pager>  (git ignora o exit do pager → segue o deploy)
```

## Referências no repo

- Workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Playbooks: `deploy/ansible/playbooks/{quick-deploy,deploy-backend,rollback}.yml`
- Host key pinada: `deploy/ci/known_hosts`
- Logs de prod ao vivo: skill `prod-logs`
- Backend tem fluxo de migração próprio (backup→migrate→swap): ver `deploy-backend.yml`
