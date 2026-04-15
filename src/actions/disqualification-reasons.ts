"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession } from "@/lib/permissions";

export const DEFAULT_DISQUALIFICATION_REASONS = [
  "Capacidade Produtiva",
  "Orçamento",
  "Cadência Excedida",
  "Perda de Contato",
  "Barrado pelo GateKeeper",
  "Concorrência",
] as const;

export async function getDisqualificationReasons(): Promise<string[]> {
  const session = await getAuthenticatedSession();

  const custom = await prisma.disqualificationReason.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });

  const customNames = custom.map((r) => r.name);
  const defaults = DEFAULT_DISQUALIFICATION_REASONS.filter(
    (d) => !customNames.includes(d)
  );

  return [...defaults, ...customNames];
}

export async function createDisqualificationReason(
  name: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAuthenticatedSession();
  const trimmed = name.trim();

  if (!trimmed || trimmed.length < 2) {
    return { success: false, error: "Nome deve ter no mínimo 2 caracteres" };
  }

  const allDefaults: string[] = [...DEFAULT_DISQUALIFICATION_REASONS];
  if (allDefaults.map((d) => d.toLowerCase()).includes(trimmed.toLowerCase())) {
    return { success: false, error: "Motivo já existe na lista padrão" };
  }

  try {
    await prisma.disqualificationReason.create({
      data: { name: trimmed, ownerId: session.user.id },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Motivo já cadastrado" };
  }
}
