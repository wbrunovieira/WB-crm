# WB Prospecção — Mobile App (Expo / React Native)

A **field prospecting app** for door-to-door sales: capture leads on the spot, from the
street, with minimal typing. It's a mobile client for the WB CRM (NestJS API), built for the
rep who walks into a store and needs to log the lead and the visit in seconds.

> Part of the **WB CRM** ecosystem (monorepo). The backend and product plan live in the same
> repository — full plan in [`../docs/plans/mobile-prospecting-app.md`](../docs/plans/mobile-prospecting-app.md).

## Stack

- **React Native + Expo (SDK 57)**, strict TypeScript
- **expo-router** (file-based navigation) · **@tanstack/react-query** (data/cache)
- **expo-secure-store** (token in the Keychain) · **expo-camera / expo-location** (later phases)
- Consumes the CRM's **NestJS REST API**

## Capture modes (product)

1. **Google Business Profile** — search the business, import name/address/phone, create the lead + the visit activity.
2. **Business card / flyer photo** — on-device OCR transcribes the data into the right fields.
3. **GPS** — fills the address from the current location.
4. **Manual** — a lean form.

## Architecture

- **Thin client over the CRM API**: no business logic in the app; it orchestrates authenticated
  calls and reuses the existing backend (leads, activities, Google Places search).
- **Single-user auth, no login screen (a deliberate design decision)**: the app is operated by a
  single user, so instead of a login flow it loads a **JWT from secure storage**
  (`expo-secure-store`) and attaches it as `Authorization: Bearer` on every request. The
  trade-offs of this choice are documented under [Security](#security).
- **Offline-first (roadmap)**: field capture faces flaky connectivity, so upcoming phases add a
  local sync queue.

```
app/                 # routes (expo-router)
  _layout.tsx        # stack + React Query + theme
  index.tsx          # Home: 4 capture modes + connection status
  google|card|gps|manual.tsx
src/lib/
  config.ts          # environment config (API URL, token)
  auth.ts            # token -> Keychain (expo-secure-store)
  api.ts             # authenticated fetch client (Bearer + error handling)
```

## Getting started

```bash
cp .env.example .env      # fill in CRM_JWT (see .env.example)
npm install
npm run ios               # open on the iOS Simulator
# or: npm start           # then scan the QR code with the Expo Go app
```

Requirements: Node 18+, and **Xcode + iOS Simulator** (or the **Expo Go** app on a device).

## Security

- **Secrets kept out of version control**: `.env` (which holds `CRM_JWT`) is gitignored; no token
  is ever committed. `api.ts` never logs the authorization header.
- **Secure on-device storage**: the token is persisted in the Keychain via `expo-secure-store`,
  not in plain storage.
- **Conscious trade-off (single-user)**: because this is a single-operator app, a distributed
  build carries the embedded token — so build artifacts are treated as sensitive material. In a
  multi-user scenario the natural evolution is login + refresh tokens and role-scoped access.

## Roadmap

| Phase | Deliverable |
|-------|-------------|
| **0** ✅ | Foundation: app, navigation, authenticated API client, Home |
| 1 | Google Business Profile + visit activity |
| 2 | GPS address + manual capture |
| 3 | Business card / flyer OCR |
| 4 | Offline queue / sync |
| 5 | Polish & internal distribution |
