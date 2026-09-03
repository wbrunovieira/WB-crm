import { BadRequestException } from "@nestjs/common";

/**
 * Converte um campo de data vindo do corpo de um PATCH preservando os TRÊS estados possíveis,
 * que o ternário `body.x ? new Date(body.x) : undefined` colapsava em dois:
 *
 *   - chave ausente  → `undefined` = "não mexer" (o use case filtra undefined antes de gravar)
 *   - `null`         → `null`      = "limpar o campo"
 *   - valor          → `Date`      = "gravar esta data"
 *
 * Sem isso, um `null` explícito caía no ramo falso e virava `undefined`: dava para trocar a
 * data, nunca esvaziá-la. Ver issues #1211 e #1213.
 *
 * Uma data ilegível vira 400 aqui, e não um `Invalid Date` que só estoura lá no Prisma como
 * 500 — corpo malformado é erro de quem chamou, não do servidor.
 */
export function parsePatchDate(
  body: Record<string, unknown>,
  field: string,
): Date | null | undefined {
  if (!(field in body)) return undefined;

  const value = body[field];
  if (value === null || value === "") return null;

  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Campo "${field}" não é uma data válida: ${String(value)}`);
  }
  return parsed;
}
