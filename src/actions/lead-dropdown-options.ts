"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession } from "@/lib/permissions";
import { DEFAULT_DIGITAL_PRESENCE_OPTIONS, type DigitalPresenceCategory } from "@/lib/lists/digital-presence-options";

export async function getLeadDropdownOptions(
  category: DigitalPresenceCategory
): Promise<{ value: string; label: string }[]> {
  const session = await getAuthenticatedSession();

  const custom = await prisma.leadDropdownOption.findMany({
    where: { ownerId: session.user.id, category },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });

  const customOptions = custom.map((r) => ({ value: r.name, label: r.name }));
  const defaultValues = DEFAULT_DIGITAL_PRESENCE_OPTIONS.map((o) => o.value as string);

  // Merge: defaults first, then custom (excluding any that match defaults)
  const filteredCustom = customOptions.filter(
    (c) => !defaultValues.includes(c.value)
  );

  return [...DEFAULT_DIGITAL_PRESENCE_OPTIONS, ...filteredCustom];
}

export async function createLeadDropdownOption(
  name: string,
  category: DigitalPresenceCategory
): Promise<{ success: boolean; error?: string }> {
  const session = await getAuthenticatedSession();
  const trimmed = name.trim();

  if (!trimmed || trimmed.length < 2) {
    return { success: false, error: "Nome deve ter no mínimo 2 caracteres" };
  }

  const defaultValues = DEFAULT_DIGITAL_PRESENCE_OPTIONS.map((o) =>
    o.value.toLowerCase()
  );
  const defaultLabels = DEFAULT_DIGITAL_PRESENCE_OPTIONS.map((o) =>
    o.label.toLowerCase()
  );

  if (
    defaultValues.includes(trimmed.toLowerCase()) ||
    defaultLabels.includes(trimmed.toLowerCase())
  ) {
    return { success: false, error: "Opção já existe na lista padrão" };
  }

  try {
    await prisma.leadDropdownOption.create({
      data: { name: trimmed, category, ownerId: session.user.id },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Opção já cadastrada" };
  }
}
