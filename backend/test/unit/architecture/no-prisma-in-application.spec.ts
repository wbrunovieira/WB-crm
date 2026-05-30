import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Architecture guardrail (Fase 4 do plano de remediação DDD).
 *
 * Regra do projeto (CLAUDE.md → "DDD layer responsibilities"):
 *   Controller = só HTTP · UseCase = orquestração · VO = validação
 *   → NUNCA injetar Prisma na camada `application` nem em controllers.
 *
 * Este teste varre o código-fonte e FALHA o CI se um arquivo proibido importar
 * o Prisma (`PrismaService` / `@/infra/database` / `prisma.service`). Trava a
 * regressão depois que as Fases 1–3 e o Tier 1 zeraram os vazamentos.
 *
 * Para corrigir uma falha: dependa de um repository port (ex.: `LeadsRepository`),
 * não do `PrismaService`. Veja exemplos nas Fases 1–3 do plano.
 */

const SRC = join(process.cwd(), "src");

// Imports do Prisma/infra de banco — pega alias (@/infra/database/...) e relativo
// (../../infra/database/...), além do arquivo do client (prisma.service).
const FORBIDDEN_IMPORTS = [
  /from\s+["'][^"']*infra\/database/,
  /from\s+["'][^"']*prisma\.service/,
];

// health.controller faz `$queryRaw SELECT 1` (liveness probe) — uso legítimo e
// único; é a allowlist explícita da regra de controllers.
const CONTROLLER_ALLOWLIST = [join("infra", "controllers", "health.controller.ts")];

// Tier 2: controller = só HTTP, não injeta repository (delega a use case).
// Ratchet — email-campaigns.controller é o último controller pendente do Tier 2
// (ainda injeta 4 repos). Removê-lo da allowlist quando for convertido.
const REPO_INJECTION = /(?:private|public|protected|readonly)\s+\w+\s*:\s*\w*Repository\b/;
const CONTROLLER_REPO_ALLOWLIST = [join("infra", "controllers", "email-campaigns.controller.ts")];

function injectsRepository(file: string): boolean {
  return REPO_INJECTION.test(readFileSync(file, "utf8"));
}

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (full.endsWith(".ts") && !full.endsWith(".spec.ts")) out.push(full);
  }
  return out;
}

function importsPrisma(file: string): boolean {
  const content = readFileSync(file, "utf8");
  return FORBIDDEN_IMPORTS.some((re) => re.test(content));
}

const allFiles = collectTsFiles(SRC);

describe("Architecture: no Prisma leak (Fase 4 guardrail)", () => {
  it("nenhum arquivo da camada `application` importa Prisma", () => {
    const offenders = allFiles
      .filter((f) => f.split(sep).includes("application"))
      .filter(importsPrisma)
      .map((f) => relative(process.cwd(), f));

    expect(
      offenders,
      `Camada application deve depender de repository ports, não do Prisma. Violações:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("nenhum controller importa Prisma (exceto a allowlist de liveness)", () => {
    const offenders = allFiles
      .filter((f) => f.endsWith(".controller.ts"))
      .filter((f) => !CONTROLLER_ALLOWLIST.some((allowed) => f.endsWith(allowed)))
      .filter(importsPrisma)
      .map((f) => relative(process.cwd(), f));

    expect(
      offenders,
      `Controller = só HTTP; delegue a um use case. Violações:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("a allowlist de controllers existe e é mínima (evita allowlist morta)", () => {
    // Cada entrada da allowlist deve apontar para um arquivo real que de fato
    // importa Prisma — senão a allowlist está obsoleta e deve ser reduzida.
    for (const allowed of CONTROLLER_ALLOWLIST) {
      const match = allFiles.find((f) => f.endsWith(allowed));
      expect(match, `Allowlist aponta para arquivo inexistente: ${allowed}`).toBeDefined();
      expect(importsPrisma(match!), `Allowlist desnecessária (não usa Prisma): ${allowed}`).toBe(true);
    }
  });

  it("nenhum controller injeta um Repository (Tier 2 — exceto allowlist pendente)", () => {
    const offenders = allFiles
      .filter((f) => f.endsWith(".controller.ts"))
      .filter((f) => !CONTROLLER_REPO_ALLOWLIST.some((allowed) => f.endsWith(allowed)))
      .filter(injectsRepository)
      .map((f) => relative(process.cwd(), f));

    expect(
      offenders,
      `Controller = só HTTP; delegue a leitura/comando a um use case (Tier 2). Violações:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("a allowlist de repo-injection é mínima/viva", () => {
    for (const allowed of CONTROLLER_REPO_ALLOWLIST) {
      const match = allFiles.find((f) => f.endsWith(allowed));
      expect(match, `Allowlist aponta para arquivo inexistente: ${allowed}`).toBeDefined();
      expect(injectsRepository(match!), `Allowlist desnecessária (não injeta Repository): ${allowed}`).toBe(true);
    }
  });
});
