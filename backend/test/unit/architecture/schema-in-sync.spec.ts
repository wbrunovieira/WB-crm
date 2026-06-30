import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Architecture guardrail: single-source Prisma schema.
 *
 * The project keeps two Prisma schemas — `backend/prisma/schema.prisma` (canonical,
 * Prisma 6, active DDD development) and the root `prisma/schema.prisma` (Next.js app,
 * the migration authority in production). They MUST stay byte-identical so both apps
 * generate the same client and the same migrations; manual drift has bitten us before.
 *
 * This test fails the suite if they diverge. To fix: `npm run schema:sync` (from the
 * repo root) copies the canonical schema over the mirror.
 *
 * Related: CLAUDE.md → "Backend migrations in both locations".
 */

const BACKEND_SCHEMA = join(process.cwd(), "prisma", "schema.prisma");
const ROOT_SCHEMA = join(process.cwd(), "..", "prisma", "schema.prisma");

describe("Prisma schemas stay in sync (single source)", () => {
  it("root prisma/schema.prisma is identical to backend/prisma/schema.prisma", () => {
    // Skip gracefully if the root schema isn't present (e.g. backend extracted on
    // its own); the guard only applies while both live in the monorepo.
    if (!existsSync(ROOT_SCHEMA)) return;

    const backend = readFileSync(BACKEND_SCHEMA, "utf8");
    const root = readFileSync(ROOT_SCHEMA, "utf8");

    expect(
      root === backend,
      "Prisma schemas are out of sync. Run `npm run schema:sync` from the repo root " +
        "to copy backend/prisma/schema.prisma → prisma/schema.prisma.",
    ).toBe(true);
  });
});
