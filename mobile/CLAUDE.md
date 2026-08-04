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
- **Single-user auth, no login screen.** A long-lived JWT is read from a git-ignored `.env`
  (`CRM_JWT`), seeded into the Keychain (`expo-secure-store`) on first run, and sent as
  `Authorization: Bearer` on every request. `getToken()` re-seeds when the embedded token
  changes (rotation = edit `.env` + rebuild). How to mint/rotate → skill `wb-crm-mobile`.
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
