# CLAUDE.md — /mobile (WB Prospecção app)

Guidance for Claude Code when working inside `/mobile`. This is a **React Native + Expo (SDK 57)**
app — a separate stack from the repo root (Next.js frontend + NestJS backend). See the root
`../CLAUDE.md` for the overall project.

**Operational runbook (JWT minting, iOS Simulator, EAS builds, icon generation) lives in the
private, git-ignored skill `wb-crm-mobile`** — never put prod infra, server IPs, or secrets in
this file (it is committed and the repo is public).

## What this app is

A door-to-door lead prospecting app. It is a **thin, authenticated client over the existing
NestJS CRM API** (`crm-api.wbdigitalsolutions.com`). Full product plan:
`../docs/plans/mobile-prospecting-app.md`.

## Architecture rules

- **No business logic in the app.** It orchestrates calls and reuses backend endpoints
  (leads, activities, Google Places search). New behavior belongs in the NestJS backend.
- **Single-user auth, no login screen.** Long-lived JWTs are read from a git-ignored `.env`
  and sent as `Authorization: Bearer` on every request. Rotation = edit `.env` + rebuild.
  How to mint/rotate → skill `wb-crm-mobile`.
- **Two companies, one app.** WB (consulting) and RDS (freight) are separate CRM instances
  with separate databases. Each has its own JWT and API URL in `.env` (`CRM_JWT` /
  `CRM_JWT_RDS`). The active company drives colours, API URL and token together; the picker
  on the home screen switches all three, and only shows when both tokens are present.
  `CompanyProvider` (`src/theme/CompanyContext.tsx`) holds the choice and mirrors it into
  `src/lib/active-company.ts`, which the non-React network layer reads.
- **Styles live inside components** (`makeStyles(c)` + `useBrand()`), not in module-level
  `StyleSheet.create`. A module stylesheet is built at import time, before the stored company
  choice can be read — and the app has no synchronous storage — so colours would be frozen to
  one brand. This is why switching repaints instantly instead of needing a reload.
- **Data flow:** UI component → React Query hook → `apiFetch` (`src/lib/api.ts`, attaches Bearer)
  → NestJS. Errors surface as `ApiError` (status + body); auth failures (401/403) are not retried.

## Conventions

- **TypeScript strict.** Path alias `@/*` → `src/*`.
- **Code comments in English.** User-facing strings in **pt-BR** (the field team is Brazilian).
- **Secrets**: only in the git-ignored `.env`; `.env.example` documents the shape. Never log the
  auth header. Never commit a token (public repo).
- **Navigation**: expo-router (file-based, `app/`). Type routes as `Href`, avoid `as never`.
- **Server state**: React Query. Keep `queryKey`s stable; gate authed queries on token presence.

## Structure

```
app/                 # routes (expo-router)
  _layout.tsx        # Stack + QueryClientProvider + theme
  index.tsx          # Home: 4 capture modes + connection check
  google|card|gps|manual.tsx   # capture screens (placeholders until their phase)
src/lib/config.ts    # env config (API URL, embedded token) via expo-constants
src/lib/auth.ts      # token bootstrap + Keychain
src/lib/api.ts       # authenticated fetch + ApiError
src/components/       # shared UI
assets/              # app icon + splash (WB mark; sources are the .svg files)
```

## Running

`npm run ios` opens on the iOS Simulator (this project pins a specific device/port to coexist
with other Expo projects — details in the skill). `npm start` for the Expo Go QR flow.
`npm run typecheck` before finishing a change.

## Roadmap (phases)

0 ✅ foundation · 1 Google Business Profile + visit · 2 GPS + manual · 3 card OCR ·
4 offline sync · 5 polish & internal distribution. One phase at a time; new backend endpoints
(reverse-geocode, card-text structuring) follow the backend's TDD + senior-review flow.
