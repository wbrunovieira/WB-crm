# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WB-crm - Clone do Pipedrive. Sistema de CRM focado em gestão de pipeline de vendas construído com Next.js 14+ full-stack.

**Repository**: https://github.com/wbrunovieira/WB-crm

**Stack**: Next.js (App Router), TypeScript, PostgreSQL, Prisma, NextAuth.js, Tailwind CSS, shadcn/ui

## Development Commands

```bash
# Development
npm run dev                    # Start development server (port 3000)

# Database
npm run db:push               # Push schema changes to database
npm run db:migrate            # Create and run migrations
npm run db:studio             # Open Prisma Studio GUI
npm run db:seed               # Seed database with initial data

# Build & Deploy
npm run build                 # Build for production
npm run start                 # Start production server
npm run lint                  # Run ESLint
```

## Architecture

### Project Structure
All source code is in `/src`:
- `/src/app` - Next.js App Router with route groups:
  - `(auth)/` - Login and registration pages
  - `(dashboard)/` - Protected dashboard routes (deals, contacts, activities, organizations, pipeline, leads)
  - `api/` - API routes for external integrations
- `/src/components` - Feature-specific components organized by domain (deals, contacts, activities, organizations, pipeline, leads)
- `/src/actions` - Server Actions for each domain (deals.ts, contacts.ts, activities.ts, organizations.ts, leads.ts, pipelines.ts, stages.ts)
- `/src/lib` - Core utilities:
  - `prisma.ts` - Prisma client singleton
  - `auth.ts` - NextAuth.js configuration with credentials provider
  - `validations/` - Zod schemas for form validation
  - `utils.ts` - Helper functions
  - `lists/` - Dropdown data (countries, industries, etc.)
- `/src/types` - TypeScript type definitions
- `/src/middleware.ts` - NextAuth middleware protecting dashboard routes
- `/prisma` - Database schema (SQLite for dev, PostgreSQL for prod) and migrations
- `/docs` - Project documentation

### Data Flow Pattern
UI Component → Server Action (with "use server") → Zod Validation → Prisma Query → Database → revalidatePath() → UI Update

**Server Actions Pattern:**
- All marked with `"use server"` directive
- Authentication checked via `getServerSession(authOptions)`
- Input validated with Zod schemas before database operations
- Use `revalidatePath()` to update UI after mutations
- Return format: `{ success: boolean, data?: T, error?: string }`

### Core Entities & Relations
- **Lead**: Prospective companies from searches/imports with multiple LeadContacts. Can be converted to Organization
- **LeadContact**: Individual contacts within a Lead. Can be converted to Contact
- **Organization**: Converted Leads or manually created companies (tracks `sourceLeadId`)
- **Contact**: Individual people linked to Organizations (tracks `sourceLeadContactId`)
- **Deal**: Sales opportunities linked to Contact/Organization, positioned in Pipeline Stages
- **Pipeline**: Container for sales process stages
- **Stage**: Steps in Pipeline (order, probability)
- **Activity**: Tasks/calls/meetings/emails linked to Deals, Contacts, or Leads
- **User**: System users with ownership of all entities

**Key Conversion Flow:** Lead → Organization | LeadContact → Contact

### Database
- **Development**: SQLite (file:./dev.db)
- **Production**: PostgreSQL
- **Schema changes**: Use `npm run db:migrate` (creates migrations) or `npm run db:push` (direct push for dev)

### Authentication
- NextAuth.js with Credentials provider (bcrypt password hashing)
- JWT session strategy
- Protected routes via middleware matching `/dashboard/:path*`, `/contacts/:path*`, `/deals/:path*`, etc.
- Session accessible via `getServerSession(authOptions)` in Server Actions

Ver `/docs/arquitetura-projeto.md` para detalhes completos da arquitetura e plano de implementação em 7 fases.
