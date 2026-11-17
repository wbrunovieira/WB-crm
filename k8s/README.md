crm
===

Bespoke kustomize app for the Kubernetes production deployment of **WB CRM**
(see the repo [README](https://github.com/wbrunovieira/crm/issues/4)):
a Next.js frontend + NestJS/Prisma backend (DDD monorepo) with a PostgreSQL
database, served at **https://crm.example.com**.

Derived from the `docker-compose.prebuiltyml` production profile and the existing
Ansible/nginx VPS topology.

## Table of Contents

[[_TOC_]]

## Layout

```
crm/
├── kustomization.yaml              # namespace crm, image overrides, common labels
├── database-cluster.yaml           # CNPG PostgreSQL cluster (ceph-block-2)
├── configmap/
│   ├── backend.yaml                # non-secret backend config (TZ, URLs, ENV_FILE_PATH)
│   └── frontend.yaml               # non-secret frontend config (NEXTAUTH_URL, BACKEND_URL…)
├── deployment/
│   ├── backend.yaml                # NestJS API — 1 replica, Recreate (RWO PVC)
│   └── frontend.yaml               # Next.js — stateless
├── job/
│   └── migrate.yaml                # `npx prisma migrate deploy` (Argo CD PreSync hook)
├── persistentvolumeclaim/
│   └── backend-config.yaml         # 100Mi ceph-block-2 — persists backend.env OAuth tokens
├── service/
│   ├── backend.yaml                # port 3010
│   └── frontend.yaml               # port 80
├── ingress.yaml                    # Traefik ingress, two hosts (see Topology)
└── secrets/
    └── application.example.yaml    # sample of the out-of-band `application` secret
```

## Requirements

### Kubernetes Cluster

The cluster must have these operators/controllers installed and configured
before these manifests can be successfully applied:

* The **CloudNativePG (CNPG) Database Operator** to provision and manage
  PostgreSQL and to define the custom resource `postgresql.cnpg.io/v1` of kind
  `Cluster` referenced in `database-cluster.yaml`.
* The **Traefik Ingress Controller** to manage external traffic and define the
  `ingressClassName: traefik` referenced in `ingress.yaml`.
* *(optional)* **Argo CD** to manage the deployment — the migrate Job carries
  `argocd.argoproj.io/hook: PreSync` annotations so schema migrations run
  before each sync (backup → migrate → swap, same order as the Ansible deploy).
  Without Argo CD, run the Job manually on schema changes.

### Persistent Storage

* **`ceph-block-2`** (RWO) for the database volume (30Gi) and the
  `backend-config` PVC (100Mi).
* **`ceph-filesystem-2`** (RWX) is not needed by this app — media/recordings
  live in S3, not on shared disk. If you ever need shared RWX storage (e.g.
  running multiple backend replicas sharing the env/token file), switch the
  PVC to that class.

### Container Images

OCI images must be available in a registry (override the placeholders in
`kustomization.yaml`):

* **`backend`** — built from the repo root with `backend/Dockerfile`
  (`docker build -f backend/Dockerfile .`). It already runs as non-root
  (`appuser`, UID 100), includes `ffmpeg` + `tzdata` and ships the `prisma`
  CLI as a production dependency (used by the migrate Job).
* **`frontend`** — built from the repo root with `frontend/Dockerfile`
  (`docker build -f frontend/Dockerfile .`, per-file ignore in
  `frontend/Dockerfile.dockerignore`). Runs as the non-root `node` user
  (UID 1000) and its ENTRYPOINT is `frontend/prepare.sh` (details below).

#### Runtime configuration of `NEXT_PUBLIC_BACKEND_URL`

Next.js inlines `NEXT_PUBLIC_*` values as string literals into the bundles at
`next build` time, so they normally can't be changed after the image is
built. To keep a single image deployable against any backend URL, the build
bakes the magic value `https://f5ec0edd-1434-4065-8985-ea01b832bc2c`
(`ARG NEXT_PUBLIC_BACKEND_URL` in the builder stage). The image ENTRYPOINT
wraps the CMD with `frontend/prepare.sh`, which at every container start:

1. reads the `NEXT_PUBLIC_BACKEND_URL` env var (falls back to
   `http://localhost:3010` with a warning when unset);
2. `sed`-replaces the magic string across **all** files in `/app/.next`
   (client chunks in `.next/static` and server bundles in `.next/server`);
3. `exec`s the original CMD (`npm start`).

The substitution is idempotent and a no-op when the image was built with a
real value. Consequence: the frontend container needs a **writable root
filesystem** (`readOnlyRootFilesystem` is disabled in
`deployment/frontend.yaml` for this reason — the backend keeps its immutable
rootfs).

### Secrets

Create the `images-pull-secret` secret:

```sh
kubectl -n crm create secret generic images-pull-secret \
  --from-file=.dockerconfigjson=docker_config.json \
  --type=kubernetes.io/dockerconfigjson
```

The `application` secret must exist in the `crm` namespace (both the
frontend and backend consume it via `envFrom`). Copy
`secrets/application.example.yaml`, fill in real values and apply it:

```sh
cp secrets/application.example.yaml secrets/application.yaml
$EDITOR secrets/application.yaml
kubectl apply -f secrets/application.yaml
```

Key points:

* `JWT_SECRET` (backend) must equal `NEXTAUTH_SECRET` (frontend) — NestJS
  verifies the JWT session tokens minted by NextAuth.
* The database credentials are **not** in this secret: they come from the
  CNPG-managed `database-app` secret and are composed into `DATABASE_URL`
  inside the deployment.

### DNS and TLS

Two DNS records must point at the Traefik ingress controller's load balancer:

* `crm.example.com` → frontend (the app itself)
* `crm-api.example.com` → backend (REST API, Swagger at `/docs`,
  webhooks, tracking)

The Traefik annotations set the `http` certificate resolver to secure both
hosts automatically.

## Topology

```
                     ┌─────────────────────────────────────────────┐
 https://crm.example.com          https://crm-api.example.com
                     │                            │
              Traefik Ingress (TLS, certresolver default)
                     │                            │
             ┌───────▼────────┐          ┌────────▼────────┐
             │ svc/frontend:80│          │ svc/backend:3010│
             │  Next.js :3000 │◄────────►│  NestJS :3010   │
             └────────────────┘  http:// │                 │
                                 backend:3010 (SSR/server
                                  actions, in-cluster)
                                          │ DATABASE_URL
                                   ┌──────▼──────┐
                                   │ CNPG Cluster│
                                   │ `database`  │
                                   │ ceph-block-2│
                                   └─────────────┘
```

Why two hosts: the browser (`apiFetch`), the mobile app and external
webhooks call the backend **directly** (`NEXT_PUBLIC_BACKEND_URL`), and
backend routes (`/leads`, `/deals`, …) collide with frontend page routes —
they can't share one hostname. This mirrors the VPS setup
(`crm.` + `crm-api.wbdigitalsolutions.com`). Webhook senders (Evolution API,
GoTo, cron jobs) should target the API host with native paths, e.g.
`https://crm-api.example.com/webhooks/whatsapp` or
`.../webhooks/goto/sync?secret=…`.

## Notes

* **Single backend replica (strategy `Recreate`)**: the backend persists OAuth
  tokens to `ENV_FILE_PATH` (`/app/config/backend.env`) on an RWO PVC — the
  k8s counterpart of the `./backend/.env:/app/backend.env` mount in
  docker-compose. Tokens are mirrored to the database as primary storage, so
  the file is a fallback.
* **TZ `America/Sao_Paulo`**: kept from docker-compose — without it the
  container runs in UTC and business-day boundaries shift (see the long
  comment in `docker-compose.yml`). Dates remain stored as UTC.
* **Cron jobs**: GoTo recording/transcription passes, WhatsApp transcription
  and Gmail polling run as *internal* NestJS schedulers (`@nestjs/schedule`),
  so they come for free with the backend pod. Only the external crontab
  triggers (`/webhooks/goto/sync`, gmail poll) need to be pointed at the API
  host.
* **Seeding**: the prod image has no `ts-node`, so `db:seed` can't run inside
  it. Create the first admin via the public registration endpoint
  (`https://crm.example.com/register` or `POST /api/register`) and then
  promote the role in the database (see below), or build a variant image with
  dev dependencies for one-off seeds.
* **CORS**: `CRM_URL=https://crm.example.com` puts the frontend origin on
  the backend allow-list (`src/backend/main.ts`).

## Testing

```sh
kustomize build . | kubectl apply --dry-run=client -f -
kubectl create ns crm
kustomize build . | kubectl apply --dry-run=server -f -
```

## Deploying

```sh
kubectl create ns crm
kubectl apply -f secrets/application.yaml
kustomize build . | kubectl apply -f -
# first deploy / schema changes only:
kubectl -n crm delete job migrate --ignore-not-found
kubectl apply -f job/migrate.yaml
kubectl -n crm logs job/migrate -f
```

## Maintenance Operations

### Accessing the Database

Install the [CloudNativePG (CNPG) **kubectl
plugin**](https://cloudnative-pg.io/documentation/current/kubectl-plugin/)
then:

```sh
kubectl cnpg -n crm status database
kubectl cnpg -n crm psql database app
```

Sample SQL:

* Promote a user to admin after self-registration:

  ```sql
  UPDATE "User" SET role='admin' WHERE email='...';
  ```

### Backups

CNPG supports scheduled backups via `ScheduledBackup` resources (barman
/cloud object storage) — not included in this sample; add one for production:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: database-backup
spec:
  schedule: "0 30 3 * * *"
  backupOwnerReference: self
  cluster:
    name: database
```

### Wiping the Database

**NOTE: Don't do this in production!!**

1. Scale dependents to 0:

   ```sh
   kubectl -n crm scale deployment backend --replicas=0
   kubectl -n crm scale deployment frontend --replicas=0
   kubectl -n crm delete job migrate --ignore-not-found
   ```

2. Delete the CNPG `Cluster` custom resource (this also removes the PVCs,
   erasing the data):

   ```sh
   kubectl -n crm delete cluster database
   ```

3. Apply again:

   ```sh
   kustomize build . | kubectl apply -f -
   ```
