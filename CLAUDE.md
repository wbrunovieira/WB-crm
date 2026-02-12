# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WB-crm - Clone do Pipedrive. Sistema de CRM focado em gestão de pipeline de vendas construído com Next.js 14+ full-stack.

**Repository**: https://github.com/wbrunovieira/WB-crm

**Stack**: Next.js 14+ (App Router), TypeScript, PostgreSQL (dev via Docker, prod), Prisma, NextAuth.js, Tailwind CSS v4, shadcn/ui

## Development Commands

```bash
# Development
npm run dev                    # Start development server (port 3000)

# Database
npm run db:push               # Push schema changes to database (dev only - NEVER use in prod)
npm run db:migrate            # Create and run migrations (ALWAYS use for schema changes)
npm run db:studio             # Open Prisma Studio GUI
npm run db:seed               # Seed database with initial data

# Testing
npm test                      # Run all tests
npm run test:watch            # Run tests in watch mode (development)
npm run test:ui               # Open Vitest UI in browser
npm run test:unit             # Run only unit tests (tests/unit)
npm run test:integration      # Run only integration tests (tests/integration)
npm run test:e2e              # Run only E2E tests (tests/e2e)
npm run test:coverage         # Run tests with coverage report

# Build & Deploy
npm run build                 # Build for production
npm run start                 # Start production server
npm run lint                  # Run ESLint
```

## Testing

Test files are in `/tests` with fixtures in `/tests/fixtures`. Vitest is configured with:
- Environment: happy-dom
- Coverage thresholds: 80% lines/functions/statements, 75% branches
- Global setup: `tests/setup.ts` includes Prisma and NextAuth mocks

Run a specific test file:
```bash
npx vitest run tests/unit/example.test.ts
```

Test structure follows AAA pattern (Arrange, Act, Assert) with fixtures from `@/tests/fixtures`.

## Environment Setup

### Database (PostgreSQL via Docker)

Development uses PostgreSQL via Docker for consistency with production:

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps
```

The `docker-compose.yml` creates PostgreSQL on port 5499 (to avoid conflicts).

### Environment Variables

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string (dev: `postgresql://crm_user:dev_password_123@localhost:5499/crm_db`)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Base URL (e.g., `http://localhost:3000`)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` - For database seeding
- `SDR_EMAIL`, `SDR_PASSWORD`, `SDR_NAME` - Optional SDR user for seeding

## Architecture

### Project Structure
All source code is in `/src`:
- `/src/app` - Next.js App Router with route groups:
  - `(auth)/` - Login and registration pages (public)
  - `(dashboard)/` - Protected dashboard routes:
    - `dashboard/` - Main dashboard page
    - `deals/` - Deals list and CRUD (new, [id], [id]/edit)
    - `contacts/` - Contacts list and CRUD (new, [id], [id]/edit)
    - `activities/` - Activities list and CRUD (new, [id], [id]/edit, calendar)
    - `organizations/` - Organizations list and CRUD (new, [id], [id]/edit)
    - `pipeline/` - Kanban pipeline view
    - `pipelines/` - Pipeline management ([id])
    - `leads/` - Leads list and CRUD (new, [id], [id]/edit)
    - `partners/` - Partners list and CRUD (new, [id], [id]/edit)
    - `projects/` - External projects integration
    - `admin/` - Admin area (business-lines, products, tech-stack, tech-profile)
  - `api/` - REST API routes for external integrations and NextAuth
- `/src/components` - Feature-specific components organized by domain (deals, contacts, activities, organizations, pipeline, leads, projects, partners, admin)
- `/src/actions` - Server Actions for each domain:
  - Core CRM: `deals.ts`, `contacts.ts`, `activities.ts`, `organizations.ts`, `leads.ts`, `partners.ts`
  - Pipeline: `pipelines.ts`, `stages.ts`, `pipeline-view.ts`
  - Lists: `organizations-list.ts`, `leads-list.ts`, `companies-list.ts`
  - Products: `business-lines.ts`, `products.ts`, `product-links.ts`
  - Tech: `tech-categories.ts`, `tech-languages.ts`, `tech-frameworks.ts`, `deal-tech-stack.ts`, `tech-profile-options.ts`, `lead-tech-profile.ts`, `organization-tech-profile.ts`
  - Utilities: `labels.ts`, `external-projects.ts`, `cnaes.ts`
- `/src/lib` - Core utilities:
  - `prisma.ts` - Prisma client singleton
  - `auth.ts` - NextAuth.js configuration with credentials provider
  - `validations/` - Zod schemas for form validation
  - `utils.ts` - Helper functions
  - `lists/` - Dropdown data (countries, industries, etc.)
  - `external-api/` - External API integrations (projects management system)
- `/src/types` - TypeScript type definitions
- `/src/middleware.ts` - NextAuth middleware protecting dashboard routes
- `/prisma` - Database schema (SQLite for dev, PostgreSQL for prod) and migrations
- `/docs` - Project documentation including implementation roadmap

### Data Flow Pattern
UI Component → Server Action (with "use server") → Zod Validation → Prisma Query → Database → revalidatePath() → UI Update

**Server Actions Pattern:**
- All marked with `"use server"` directive at top of file
- Authentication checked via `getServerSession(authOptions)` (ALWAYS do this first)
- Input validated with Zod schemas before database operations
- Use `revalidatePath()` to update UI after mutations
- Return format: `{ success: boolean, data?: T, error?: string }` or throw Error

**Example Server Action:**
```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createDeal(data: DealFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Zod validation
  const validated = dealSchema.parse(data);

  const deal = await prisma.deal.create({
    data: {
      ...validated,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/deals");
  return deal;
}
```

### Core Entities & Relations
- **Lead**: Prospective companies from searches/imports with multiple LeadContacts. Can be converted to Organization. Can track referrals via `referredByPartnerId`. Has tech profile (languages, frameworks, hosting, databases, ERPs, CRMs, ecommerce) and CNAE classifications
- **LeadContact**: Individual contacts within a Lead. Can be converted to Contact
- **Organization**: Converted Leads or manually created companies (tracks `sourceLeadId`). Can link to external projects via `externalProjectIds` (JSON array). Has tech profile and CNAE classifications
- **Contact**: Individual people linked to Organizations, Leads, or Partners (tracks `sourceLeadContactId`)
- **Deal**: Sales opportunities linked to Contact/Organization, positioned in Pipeline Stages. Has products (via DealProduct junction), tech stack categories, languages, and frameworks
- **Pipeline**: Container for sales process stages
- **Stage**: Steps in Pipeline (order, probability)
- **Activity**: Tasks/calls/meetings/emails/whatsapp/physical_visit/instagram_dm linked to Deals, Contacts, Leads, or Partners. Supports multiple contacts via `contactIds` JSON field
- **Partner**: Company-based entities for partnerships (agencia_digital, consultoria, universidade, fornecedor, indicador, investidor, mentor, parceiro_tecnologico, associacao, midia, outros). Can have Contacts and Activities, and refer Leads. Can link to products
- **User**: System users with ownership of all entities
- **Label**: Color-coded tags for Leads and Organizations
- **BusinessLine**: Product categorization (e.g., "Desenvolvimento Web", "Automação", "IA"). Has multiple Products
- **Product**: Services/products offered. Links to Leads (interest), Organizations (purchase history), Deals (specific items), and Partners (expertise)
- **CNAE**: Brazilian economic activity classification system. Used for primary and secondary activities of Leads and Organizations
- **Tech Profile**: System for tracking current technology stack of Leads/Organizations (languages, frameworks, hosting, databases, ERPs, CRMs, ecommerce platforms)
- **Tech Stack**: System for tracking required technologies in Deals (categories, languages, frameworks)

**Key Conversion Flow:** Lead → Organization | LeadContact → Contact

**Lead to Organization Conversion:**
- Lead stores `convertedToOrganizationId` (one-to-one)
- Organization stores `sourceLeadId` for tracking
- LeadContact stores `convertedToContactId` (one-to-one)
- Contact stores `sourceLeadContactId` for tracking
- When converting, tech profile and CNAE data should be transferred from Lead to Organization

**External Project Integration:**
- Organizations can link to external projects from a separate project management system
- Project IDs stored as JSON array in `Organization.externalProjectIds`
- External API client in `/src/lib/external-api/projects.ts` handles fetching project data
- Server actions in `/src/actions/external-projects.ts` handle linking/unlinking

**JSON Fields for Multiple Values:**
- `Activity.contactIds` - Array of contact IDs when activity involves multiple contacts (primary contact still in `contactId`)
- `Organization.externalProjectIds` - Array of external project IDs
- Parse/stringify these fields when reading/writing to database

### Database
- **Development**: PostgreSQL via Docker (port 5499) - `docker-compose up -d`
- **Production**: PostgreSQL (via `DATABASE_URL` environment variable)
- **Schema changes**: ALWAYS use `npm run db:migrate` to create migrations (never use `db:push` in production)
- **Data isolation**: All entities have `ownerId` foreign key to User
  - CRITICAL: ALWAYS filter queries by `ownerId: session.user.id` to ensure users only see their own data
  - Verify ownership before updates/deletes: check `existingRecord.ownerId === session.user.id`

### Authentication
- NextAuth.js with Credentials provider (bcrypt password hashing)
- JWT session strategy (no database sessions)
- Protected routes via middleware matching `/dashboard/:path*`, `/contacts/:path*`, `/deals/:path*`, `/activities/:path*`, `/organizations/:path*`, `/pipeline/:path*`, `/partners/:path*`, `/projects/:path*`
- Session accessible via `getServerSession(authOptions)` in Server Actions
- Session includes: `user.id`, `user.email`, `user.name`, `user.role`
- Login page: `/login`, protected routes redirect unauthenticated users there

**User Roles** (`UserRole` type in `/src/types/next-auth.d.ts`):
- `admin` - Full access, can see all users and data
- `sdr` - Sales Development Representative (prospecting/qualification)
- `closer` - Account Executive (closing deals)

**Permission Helpers** (`/src/lib/permissions.ts`):
- `getAuthenticatedSession()` - Get session or throw "Não autorizado"
- `getOwnerFilter(ownerIdFilter?)` - Returns `{ ownerId: id }` for sdr/closer, `{}` for admin (supports "all", "mine", or specific userId)
- `canAccessRecord(ownerId)` - Check if user can access a specific record
- `canAccessEntity(entityType, entityId, entityOwnerId)` - Check access including shared entities
- `getOwnerOrSharedFilter(entityType, ownerIdFilter?)` - Filter that includes owned AND shared entities
- `getSharedEntityIds(entityType)` - Get IDs of entities shared with current user
- `isAdmin()` / `getUserRole()` - Role checking utilities

**Entity Sharing** (`SharedEntity` model):
- Admins can share records (leads, contacts, organizations, partners, deals) with other users without transferring ownership
- Non-admin users can view both owned records AND records shared with them
- Use `canAccessEntity()` and `getOwnerOrSharedFilter()` to properly check/filter including shared records

### API Routes
Located in `/src/app/api/`:
- `auth/[...nextauth]/route.ts` - NextAuth.js handlers
- `register/route.ts` - User registration
- `contacts/route.ts` & `contacts/[id]/route.ts` - Contact REST API
- `deals/route.ts` & `deals/[id]/route.ts` - Deal REST API
- `activities/route.ts` & `activities/[id]/route.ts` - Activity REST API
- `organizations/route.ts` & `organizations/[id]/route.ts` - Organization REST API
- `products/active/route.ts` - Get active products

Note: Server Actions are preferred over API routes for internal operations. API routes exist primarily for external integrations.

### Admin Area
The system includes an admin area (`/dashboard/admin`) for managing:
- **Business Lines**: Product categories with slugs, colors, and icons
- **Products**: Individual products/services linked to business lines with pricing info
- **Tech Stack**: Tech categories (Frontend, Backend, etc.), languages, and frameworks for deal tracking
- **Tech Profile**: Technology options (languages, frameworks, hosting, databases, ERPs, CRMs, ecommerce) for tracking current tech stack of Leads/Organizations

All admin entities use slugs for URL-friendly identifiers and support active/inactive states.

### Key Libraries
- **@dnd-kit/core** & **@dnd-kit/sortable** - Drag & Drop for Kanban pipeline view
- **Zod** - Schema validation (schemas in `/src/lib/validations/`)
- **date-fns** - Date formatting
- **Zustand** - Optional state management (for complex client-side state)
- **Sonner** - Toast notifications (customized in `globals.css`)
- **shadcn/ui** - UI component library (not installed via npm, copied directly into `/src/components`)

See `/docs/arquitetura-projeto.md` for complete architecture and 7-phase implementation plan.

## Important Development Notes

### Critical Security & Data Rules
- **Data Isolation**: ALWAYS filter database queries by `ownerId: session.user.id` to ensure users only see their own data
  - Exception: Admin-managed entities (BusinessLine, Product, TechCategory, TechLanguage, TechFramework, TechProfile*, CNAE, Pipeline, Stage) are NOT user-scoped and don't have ownerId
  - Exception: Labels ARE user-scoped with unique constraint `[name, ownerId]`
- **Ownership Verification**: Before updates/deletes, verify `existingRecord.ownerId === session.user.id`
- **Authentication First**: ALWAYS check session at the start of every Server Action before any database operation

### Architecture Patterns
- **Server vs Client**: Default to Server Components; only use `"use client"` when needed (forms, interactivity, hooks)
- **Validation**: Define Zod schemas in `/src/lib/validations/` and reuse them for both server and client validation
- **Revalidation**: Always call `revalidatePath()` after mutations to update the UI cache
- **Deprecated Fields**: Lead model has deprecated fields `primaryActivity` and `secondaryActivities` - use CNAE system instead (`primaryCNAEId`, `secondaryCNAEs` junction table, or `internationalActivity` for non-Brazilian companies)

### Technology-Specific Notes
- **Tailwind CSS v4**: Uses new `@import "tailwindcss"` and `@theme` syntax in `globals.css` (NOT `tailwind.config.js`)
- **Custom Theme**: Dark purple theme defined in `globals.css` with CSS variables (`--color-primary: #792990`)
- **Brazilian Portuguese**: All UI text is in Portuguese (pt-BR)
- **Multi-currency**: Deals support different currencies (default: `BRL`)
- **CNAE Integration**: Brazilian companies use CNAE (Classificação Nacional de Atividades Econômicas) for primary and secondary economic activities. International companies use free-text `internationalActivity` field
- **Many-to-Many Relations**: The system uses junction tables with additional fields:
  - `LeadProduct`, `OrganizationProduct`, `DealProduct`, `PartnerProduct` - Link entities to products with context-specific data
  - `LeadSecondaryCNAE`, `OrganizationSecondaryCNAE` - Link entities to multiple CNAEs
  - Tech profile junctions: `LeadLanguage`, `OrganizationLanguage`, etc. - Track current tech stack
  - Deal tech junctions: `DealTechStack`, `DealLanguage`, `DealFramework` - Track required technologies

## Git Workflow

When the user types "github", perform these steps:
1. Run `git add .` to stage all changes
2. Create a commit with a short message in English describing the changes
3. Run `git push` to push to remote repository

Note: Pushing to `main` triggers automatic deployment via GitHub Actions (Ansible-based deployment to production server at crm.wbdigitalsolutions.com).

## Production Server

**Server**: `45.90.123.190` (root access via SSH key `~/.ssh/id_rsa`)

### Apps Running
- **WB-CRM** (Next.js) - PM2 process `wb-crm`, porta 3000, dir `/opt/wb-crm`
- **n8n** (Docker) - container `n8n`, porta 5678
- **Evolution API** (Docker) - container `evolution_postgres`
- **Nextcloud** (Docker)
- **Chatbot** (Docker)

### Nginx Sites Configured
- `crm.wbdigitalsolutions.com` → localhost:3000 (CRM)
- `n8n.wbdigitalsolutions.com` → localhost:5678 (n8n)
- `chatbotwb.wbdigitalsolutions.com`
- `nextcloud.wbdigitalsolutions.com`

### Database Backups (Automático via Crontab)

**CRM** (PostgreSQL em Docker `crm_postgres`):
- Script: `/opt/backups/backup-crm.sh`
- Horário: 3:30 AM diariamente
- Local: `/opt/backups/crm/`
- Google Drive: `gdrive:backups/wb-crm/`
- Retenção: 7 dias

**n8n** (PostgreSQL em Docker `n8n_postgres`):
- Script: `/root/n8n/backup-n8n.sh`
- Horário: 3:00 AM diariamente
- Local: `/root/n8n/backups/`
- Google Drive: `gdrive:backups/n8n/`
- Retenção: 30 dias

**Verificar backups:**
```bash
# Ver backups no Google Drive
ssh root@45.90.123.190 "rclone ls gdrive:backups/"

# Ver logs de backup
ssh root@45.90.123.190 "tail -50 /var/log/crm-backup.log"
```

### Deploy Commands (Ansible)

```bash
cd deploy/ansible

# Deploy rápido (sem migrations)
ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml

# Deploy com migrations (faz backup antes)
ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml

# Rollback
ansible-playbook -i inventory/production.yml playbooks/rollback.yml \
  -e "backup_file=pre_migration_XXXXXXXX_XXXXXX.sql"
```

### SSL Certificates
- Gerenciados pelo Certbot (Let's Encrypt)
- Renovação automática via crontab (segundas às 2:00 AM)
- Configs em `/etc/nginx/sites-available/`
