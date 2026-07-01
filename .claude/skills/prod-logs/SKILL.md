---
name: prod-logs
description: Abre os logs de PRODUÇÃO do WB-CRM (backend NestJS via docker + frontend Next.js via pm2) numa sessão tmux com dois painéis lado a lado e auto-reconexão. Use sempre que o usuário pedir para ver/abrir/acompanhar os logs de produção, "os logs do backend e do frontend", debugar um erro em prod, ou monitorar um deploy. O servidor é 45.90.123.190.
---

# Logs de produção em tmux (backend + frontend)

Servidor de produção: `root@45.90.123.190`
- **Backend** (NestJS): container docker `wb-crm-backend` → `docker logs -f wb-crm-backend`
- **Frontend** (Next.js): processo pm2 `wb-crm` → `pm2 logs wb-crm`

## ⚠️ Regra importante (por que NÃO dá pra abrir o tmux por você)

O Bash do agente roda num **sandbox isolado** do terminal do usuário. Um `tmux` iniciado
pelo agente vive no contexto dele e **não aparece no terminal do usuário**. Portanto:

> **Nunca** tente `tmux attach` pelo agente esperando que apareça pro usuário.
> O fluxo é: **garantir que o script existe** e **dar o comando pro usuário rodar no terminal dele**.

## O que fazer quando a skill é acionada

1. Escrever/atualizar o script `~/wb-prod-logs.sh` com o conteúdo abaixo (idempotente — sempre
   sobrescrever pra manter a versão com auto-reconexão) e `chmod +x`.
2. Dizer ao usuário para rodar, **no terminal dele**:
   ```
   ~/wb-prod-logs.sh
   ```
3. Lembrar os atalhos: sair sem matar `Ctrl-b d`; alternar painel `Ctrl-b →/←`;
   rolar `Ctrl-b [` (`q` sai); encerrar `tmux kill-session -t wblogs`.

## Conteúdo do script (`~/wb-prod-logs.sh`)

```bash
#!/usr/bin/env bash
# Logs de produção do WB-CRM em tmux: backend (docker) + frontend (pm2), lado a lado.
# Auto-reconecta: se o container for recriado num deploy (docker logs -f morre) ou o
# ssh cair, o painel reata sozinho. Rode no SEU terminal: ~/wb-prod-logs.sh
SRV="root@45.90.123.190"
SESS="wblogs"

BACKEND="while true; do ssh -o ConnectTimeout=10 -o ServerAliveInterval=30 $SRV 'docker logs -f --tail 60 wb-crm-backend' 2>&1; echo '--- [backend] container reiniciou ou ssh caiu — reconectando em 2s ---'; sleep 2; done"
FRONTEND="while true; do ssh -o ConnectTimeout=10 -o ServerAliveInterval=30 $SRV 'pm2 logs wb-crm --lines 60'; echo '--- [frontend] pm2/ssh caiu — reconectando em 2s ---'; sleep 2; done"

tmux kill-session -t "$SESS" 2>/dev/null
tmux new-session -d -s "$SESS" -n logs
tmux send-keys -t "$SESS:logs.0" "$BACKEND" C-m
tmux split-window -h -t "$SESS:logs"
tmux send-keys -t "$SESS:logs.1" "$FRONTEND" C-m
tmux set  -t "$SESS" pane-border-status top
tmux select-pane -t "$SESS:logs.0" -T ' BACKEND (docker · auto-reconnect) '
tmux select-pane -t "$SESS:logs.1" -T ' FRONTEND (pm2 · auto-reconnect) '
tmux set  -t "$SESS" mouse on
tmux attach -t "$SESS"
```

## Por que auto-reconexão

Num deploy o backend recria o container (`docker rm -f wb-crm-backend` → `docker compose up`).
O `docker logs -f` estava seguindo o container **antigo**; quando ele some, o stream **morre e o
painel congela** (não reata sozinho no container novo). O `while true; do ssh ...; sleep 2; done`
reata no container novo automaticamente. Mesma proteção para quedas de ssh.

## Pré-requisitos
- `tmux` instalado localmente (`brew install tmux`).
- Acesso ssh ao servidor de prod (`root@45.90.123.190`, chave `~/.ssh/id_rsa`).

## Variações úteis
- Só backend: `ssh root@45.90.123.190 'docker logs -f wb-crm-backend'`
- Só frontend: `ssh root@45.90.123.190 'pm2 logs wb-crm'`
- Filtrar erro no frontend: `ssh root@45.90.123.190 'tail -f /root/.pm2/logs/wb-crm-error-0.log'`

## Warp / prefixo Ctrl-b

No **Warp** (e outros terminais com atalhos próprios) o prefixo `Ctrl-b` do tmux colide.
Por isso: ligar `tmux set mouse on` — dá pra **clicar** pra trocar de painel, **rolar** com o
scroll e **arrastar a borda** pra redimensionar, sem usar `Ctrl-b`. Prefira **painéis na mesma
janela** (tudo visível de uma vez) a **janelas** (que exigem `Ctrl-b w`/`n`/`p` pra alternar).

## Deploy + logs NA MESMA TELA (recomendado — `~/wb-deploy-pane.sh`)

Abre o deploy como **painel full-width embaixo** dos logs (logs em cima, deploy embaixo), tudo
numa janela só — nada some, sem trocar de janela. Ideal pro Warp. O USUÁRIO roda:
```
~/wb-deploy-pane.sh quick-deploy      # frontend + backend
~/wb-deploy-pane.sh deploy-backend    # backend + migração
```
Conteúdo (`~/wb-deploy-pane.sh`): cria a sessão `wblogs` com os 2 painéis de log se não existir,
liga o mouse, e faz `tmux split-window -v -f -l 60%` pra colocar o ansible embaixo em tela cheia.
Ao terminar mostra "TERMINOU"; feche o painel com `exit`. **Não dispare dois deploys ao mesmo
tempo** (builds se atropelam).

## Deploy em outra JANELA (`~/wb-deploy.sh`) — alternativa

Mesma limitação de sandbox: o agente não deve rodar o deploy por si só se o usuário quer
**assistir** — ele roda invisível no sandbox. Em vez disso, o deploy roda numa **janela nova**
da sessão `wblogs`, via `~/wb-deploy.sh`, que o USUÁRIO executa. Alternar janelas: `Ctrl-b n`
ou `Ctrl-b <número>`; fechar a janela do deploy ao terminar: `Ctrl-b &`.

Conteúdo de `~/wb-deploy.sh`:
```bash
#!/usr/bin/env bash
# Roda um playbook ansible numa NOVA JANELA do tmux 'wblogs' (junto dos logs).
# Uso:  ~/wb-deploy.sh quick-deploy      (frontend + backend, sem migração)
#       ~/wb-deploy.sh deploy-backend    (backend + migração)
PB="${1:-quick-deploy}"
DIR="$HOME/projects/WB-crm/deploy/ansible"
SESS="wblogs"
CMD="cd '$DIR' && ansible-playbook -i inventory/production.yml playbooks/$PB.yml; echo; echo '=== $PB TERMINOU — feche com Ctrl-b & ==='; exec bash"
tmux has-session -t "$SESS" 2>/dev/null || tmux new-session -d -s "$SESS" -n logs
tmux new-window -t "$SESS" -n "deploy" "$CMD"
if [ -n "$TMUX" ]; then tmux select-window -t "$SESS:deploy"; else tmux attach -t "$SESS"; fi
```
