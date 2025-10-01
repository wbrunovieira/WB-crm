# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WB-crm - Clone do Pipedrive. Sistema de CRM focado em gestão de pipeline de vendas construído com Next.js 14+ full-stack.

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
- `/app` - Next.js App Router (routes, layouts, pages)
- `/components` - React components (ui, deals, contacts, activities, shared)
- `/actions` - Server Actions (deals, contacts, activities, organizations)
- `/lib` - Utilities, Prisma client, auth config, validations (Zod)
- `/types` - TypeScript type definitions
- `/prisma` - Database schema and migrations
- `/docs` - Project documentation

### Data Flow Pattern
UI Component → Server Action → Validation (Zod) → Prisma → PostgreSQL → Revalidation → UI Update

### Core Entities
- **User**: Users and authentication
- **Organization**: Companies/Organizations
- **Contact**: Individual contacts/people
- **Deal**: Sales deals/opportunities
- **Pipeline**: Sales pipelines
- **Stage**: Pipeline stages
- **Activity**: Tasks, calls, meetings, emails

Ver `/docs/arquitetura-projeto.md` para detalhes completos da arquitetura e plano de implementação em 7 fases.
