# WB CRM

**Production-grade B2B sales CRM** — full-stack, architected with Domain-Driven Design and backed by **600+ automated tests**. Runs the whole sales cycle on a drag-and-drop kanban pipeline, with AI call/meeting analysis, a visual bot-flow builder, and native Google (Gmail, Meet, Places) integrations.

[![CI](https://github.com/wbrunovieira/WB-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/wbrunovieira/WB-crm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

> Built end to end — domain modeling → API → UI → tests → deploy — as the sales engine for WB Digital Solutions.

## Highlights

- **Domain-Driven Design, by bounded context.** Each domain (`leads`, `deals`, `activities`, `auth`, `bot-flows`, `admin`, …) is split into `enterprise` (entities, value objects, domain events) and `application` (use-cases, repository ports), with NestJS/Prisma kept at the infrastructure edge. The business core is framework-agnostic and fully testable.
- **600+ automated tests** — unit (Vitest) + end-to-end (Playwright), covering domain rules and complete user flows.
- **Kanban sales pipeline** — drag-and-drop deals across stages (`@dnd-kit`), with stage history, activities, labels and cadences.
- **AI-assisted selling** — call analysis, meeting analysis and gatekeeper analysis, plus scheduled/automated email sends.
- **Visual bot-flows** — node-based flow builder (`@xyflow/react`) for lead qualification and automation.
- **Native Google integrations** — Gmail, Google Meet and Google Places (lead discovery) via `google-auth-library` / `googleapis`.
- **Lead tech-stack profiling** — models a lead's stack (languages, frameworks, hosting, database, ERP, CRM) to tailor the pitch.

## Architecture

Monorepo — Next.js frontend + NestJS/Prisma backend, DDD:

```
.
├── src/                       # Next.js (App Router) frontend
├── backend/                   # NestJS + Prisma API
│   ├── src/
│   │   ├── core/domain/events # shared domain events
│   │   └── domain/<context>/
│   │       ├── enterprise/    # entities · value-objects · read-models
│   │       ├── application/   # use-cases · repository ports
│   │       └── infra/         # controllers · prisma repositories · adapters
│   └── prisma/schema.prisma
├── e2e/                       # Playwright end-to-end tests
├── tests/                     # test setup & helpers
├── deploy/                    # deployment (Ansible / IaC)
├── docs/                      # architecture, API docs, integration plans
└── docker-compose.yml
```

Structuring each context this way keeps business rules independent of the framework and the database — the same discipline used in larger enterprise systems.

## Tech stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js · React · next-auth · TanStack React Query · @dnd-kit (kanban) · @xyflow/react (flow builder) · Tailwind CSS |
| **Backend** | NestJS · Prisma · PostgreSQL · DDD / Clean Architecture · Swagger (next-swagger-doc) |
| **Integrations** | Google APIs (Gmail · Meet · Places) · AWS S3 · WhatsApp (Evolution API) |
| **Testing** | Vitest (unit) · Playwright (E2E) |
| **Infra** | Docker Compose · Ansible |

## Getting started

```bash
# 1. Configure environment
cp .env.example .env            # DB + Google/API credentials

# 2. Start Postgres and services
docker compose up -d

# 3. Install deps + run migrations
npm install
npm --prefix backend install
npm --prefix backend run db:migrate      # applies Prisma migrations (backend owns the schema)

# 4. Run frontend + backend
npm run dev
```

## Tests

```bash
npm run test            # everything (frontend + backend unit)
npm run test:unit       # Vitest unit tests
npm run test:e2e        # Playwright end-to-end (boots next dev on its own)
npm run test:coverage   # coverage report
```

CI (GitHub Actions) runs on every push/PR to `main`: **lint → unit → build → E2E** (Playwright frontend + backend against Postgres). See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Documentation

See [`docs/`](docs/): project architecture (`arquitetura-projeto.md`), API reference (`docs/api/`), the testing plan, and integration plans (Google, WhatsApp/Evolution, GoTo Connect).

## License

[MIT](./LICENSE) © Bruno Vieira
