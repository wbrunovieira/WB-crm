#!/usr/bin/env node
/**
 * Single-source Prisma schema.
 *
 * `backend/prisma/schema.prisma` is the CANONICAL schema (active DDD development,
 * Prisma 6). The root `prisma/schema.prisma` (Next.js app, the migration authority
 * in production) must be a verbatim copy so both apps generate the same client and
 * the same migrations.
 *
 * Usage:
 *   node scripts/sync-prisma-schema.mjs          # copy backend → root
 *   node scripts/sync-prisma-schema.mjs --check  # exit 1 if they differ (CI/guard)
 *
 * SAFETY: this is a pure reorganization — the datamodel is unchanged, so it
 * generates NO migration. The generator/datasource headers are currently identical
 * in both files; if they ever need to diverge per-app, switch this to a
 * model-block-only sync instead of a full-file copy.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL = resolve(root, "backend/prisma/schema.prisma");
const MIRROR = resolve(root, "prisma/schema.prisma");

const check = process.argv.includes("--check");

const canonical = readFileSync(CANONICAL, "utf8");
const mirror = readFileSync(MIRROR, "utf8");

if (check) {
  if (canonical !== mirror) {
    console.error(
      "✗ Prisma schemas are out of sync.\n" +
        "  Canonical: backend/prisma/schema.prisma\n" +
        "  Mirror:    prisma/schema.prisma\n" +
        "  Fix with:  npm run schema:sync\n",
    );
    process.exit(1);
  }
  console.log("✓ Prisma schemas are in sync.");
  process.exit(0);
}

if (canonical === mirror) {
  console.log("✓ Already in sync — nothing to do.");
  process.exit(0);
}

writeFileSync(MIRROR, canonical);
console.log("✓ Synced backend/prisma/schema.prisma → prisma/schema.prisma");
