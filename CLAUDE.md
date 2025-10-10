# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WB-crm - Clone do Pipedrive. Sistema de CRM focado em gestão de pipeline de vendas construído com Next.js 14+ full-stack.

**Repository**: https://github.com/wbrunovieira/WB-crm

**Stack**: Next.js 14+ (App Router), TypeScript, SQLite (dev) / PostgreSQL (prod), Prisma, NextAuth.js, Tailwind CSS v4, shadcn/ui

## Development Commands

```bash
# Development
npm run dev                    # Start development server (port 3000)

# Database
npm run db:push               # Push schema changes to database (dev only - NEVER use in prod)
npm run db:migrate            # Create and run migrations (ALWAYS use for schema changes)
npm run db:studio             # Open Prisma Studio GUI
npm run db:seed               # Seed database with initial data

# Build & Deploy
npm run build                 # Build for production
npm run start                 # Start production server
npm run lint                  # Run ESLint
```

## Environment Setup

Required environment variables (see `.env.example`):
- `DATABASE_URL` - SQLite file path for dev (`file:./dev.db`) or PostgreSQL connection string for prod
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Base URL (e.g., `http://localhost:3000`)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` - For database seeding

## Architecture

### Project Structure
All source code is in `/src`:
- `/src/app` - Next.js App Router with route groups:
  - `(auth)/` - Login and registration pages (public)
  - `(dashboard)/` - Protected dashboard routes (deals, contacts, activities, organizations, pipeline, leads, projects)
  - `api/` - REST API routes for external integrations and NextAuth
- `/src/components` - Feature-specific components organized by domain (deals, contacts, activities, organizations, pipeline, leads, projects)
- `/src/actions` - Server Actions for each domain (deals.ts, contacts.ts, activities.ts, organizations.ts, leads.ts, pipelines.ts, stages.ts, labels.ts, external-projects.ts)
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
- **Lead**: Prospective companies from searches/imports with multiple LeadContacts. Can be converted to Organization. Can track referrals via `referredByPartnerId`
- **LeadContact**: Individual contacts within a Lead. Can be converted to Contact
- **Organization**: Converted Leads or manually created companies (tracks `sourceLeadId`). Can link to external projects via `externalProjectIds` (JSON array)
- **Contact**: Individual people linked to Organizations, Leads, or Partners (tracks `sourceLeadContactId`)
- **Deal**: Sales opportunities linked to Contact/Organization, positioned in Pipeline Stages
- **Pipeline**: Container for sales process stages
- **Stage**: Steps in Pipeline (order, probability)
- **Activity**: Tasks/calls/meetings/emails/whatsapp/physical_visit/instagram_dm linked to Deals, Contacts, Leads, or Partners
- **Partner**: Company-based entities for partnerships (consultoria, universidade, fornecedor, indicador, investidor). Can have Contacts and Activities, and refer Leads
- **User**: System users with ownership of all entities
- **Label**: Color-coded tags for Leads and Organizations

**Key Conversion Flow:** Lead → Organization | LeadContact → Contact

**Lead to Organization Conversion:**
- Lead stores `convertedToOrganizationId` (one-to-one)
- Organization stores `sourceLeadId` for tracking
- LeadContact stores `convertedToContactId` (one-to-one)
- Contact stores `sourceLeadContactId` for tracking

**External Project Integration:**
- Organizations can link to external projects from a separate project management system
- Project IDs stored as JSON array in `Organization.externalProjectIds`
- External API client in `/src/lib/external-api/projects.ts` handles fetching project data
- Server actions in `/src/actions/external-projects.ts` handle linking/unlinking

### Database
- **Development**: SQLite (`file:./dev.db`)
- **Production**: PostgreSQL (via `DATABASE_URL` environment variable)
- **Schema changes**: ALWAYS use `npm run db:migrate` to create migrations (never use `db:push` in production)
- **Data isolation**: All entities have `ownerId` foreign key to User
  - CRITICAL: ALWAYS filter queries by `ownerId: session.user.id` to ensure users only see their own data
  - Verify ownership before updates/deletes: check `existingRecord.ownerId === session.user.id`

### Authentication
- NextAuth.js with Credentials provider (bcrypt password hashing)
- JWT session strategy (no database sessions)
- Protected routes via middleware matching `/dashboard/:path*`, `/contacts/:path*`, `/deals/:path*`, `/activities/:path*`, `/organizations/:path*`, `/pipeline/:path*`, `/projects/:path*`
- Session accessible via `getServerSession(authOptions)` in Server Actions
- Session includes: `user.id`, `user.email`, `user.name`, `user.role`

### API Routes
Located in `/src/app/api/`:
- `auth/[...nextauth]/route.ts` - NextAuth.js handlers
- `register/route.ts` - User registration
- `contacts/route.ts` & `contacts/[id]/route.ts` - Contact REST API
- `deals/route.ts` & `deals/[id]/route.ts` - Deal REST API
- `activities/route.ts` & `activities/[id]/route.ts` - Activity REST API
- `organizations/route.ts` & `organizations/[id]/route.ts` - Organization REST API

Note: Server Actions are preferred over API routes for internal operations. API routes exist primarily for external integrations.

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
- **Ownership Verification**: Before updates/deletes, verify `existingRecord.ownerId === session.user.id`
- **Authentication First**: ALWAYS check session at the start of every Server Action before any database operation

### Architecture Patterns
- **Server vs Client**: Default to Server Components; only use `"use client"` when needed (forms, interactivity, hooks)
- **Validation**: Define Zod schemas in `/src/lib/validations/` and reuse them for both server and client validation
- **Revalidation**: Always call `revalidatePath()` after mutations to update the UI cache

### Technology-Specific Notes
- **Tailwind CSS v4**: Uses new `@import "tailwindcss"` and `@theme` syntax in `globals.css` (NOT `tailwind.config.js`)
- **Custom Theme**: Dark purple theme defined in `globals.css` with CSS variables (`--color-primary: #792990`)
- **Brazilian Portuguese**: All UI text is in Portuguese (pt-BR)
- **Multi-currency**: Deals support different currencies (default: `BRL`)

## Git Workflow

When the user types "github", perform these steps:
1. Run `git add .` to stage all changes
2. Create a commit with a short message in English describing the changes
3. Run `git push` to push to remote repository

Note: All development is local only. No CI/CD pipelines or GitHub Actions.
