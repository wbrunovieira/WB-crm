"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type EntityTransferType = "lead" | "organization";

export interface EntityTransferResult {
  id: string;
  name: string;
  type: EntityTransferType;
  inOperationsAt: Date | null;
}

// ---------------------------------------------------------------------------
// searchEntitiesForTransfer

export async function searchEntitiesForTransfer(
  query: string
): Promise<EntityTransferResult[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");
  if (session.user.role !== "admin") throw new Error("Acesso negado");

  const [leads, orgs] = await Promise.all([
    prisma.lead.findMany({
      where: {
        businessName: { contains: query, mode: "insensitive" },
      },
      select: { id: true, businessName: true, inOperationsAt: true },
      take: 20,
      orderBy: { businessName: "asc" },
    }),
    prisma.organization.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, inOperationsAt: true },
      take: 20,
      orderBy: { name: "asc" },
    }),
  ]);

  const leadResults: EntityTransferResult[] = leads.map((l) => ({
    id: l.id,
    name: l.businessName,
    type: "lead",
    inOperationsAt: l.inOperationsAt,
  }));

  const orgResults: EntityTransferResult[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    type: "organization",
    inOperationsAt: o.inOperationsAt,
  }));

  return [...leadResults, ...orgResults].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// ---------------------------------------------------------------------------
// transferToOperations

export async function transferToOperations(
  entityType: EntityTransferType,
  entityId: string
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");
  if (session.user.role !== "admin") throw new Error("Acesso negado");

  if (entityType === "organization") {
    const org = await prisma.organization.findUnique({ where: { id: entityId } });
    if (!org) throw new Error("Organização não encontrada");

    await prisma.organization.update({
      where: { id: entityId },
      data: { inOperationsAt: new Date() },
    });

    revalidatePath("/admin/operations");
    revalidatePath(`/organizations/${entityId}`);
  } else {
    const lead = await prisma.lead.findUnique({ where: { id: entityId } });
    if (!lead) throw new Error("Lead não encontrado");

    await prisma.lead.update({
      where: { id: entityId },
      data: { inOperationsAt: new Date() },
    });

    revalidatePath("/admin/operations");
    revalidatePath(`/leads/${entityId}`);
  }
}

// ---------------------------------------------------------------------------
// revertFromOperations

export async function revertFromOperations(
  entityType: EntityTransferType,
  entityId: string
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");
  if (session.user.role !== "admin") throw new Error("Acesso negado");

  if (entityType === "organization") {
    const org = await prisma.organization.findUnique({ where: { id: entityId } });
    if (!org) throw new Error("Organização não encontrada");

    await prisma.organization.update({
      where: { id: entityId },
      data: { inOperationsAt: null },
    });

    revalidatePath("/admin/operations");
    revalidatePath(`/organizations/${entityId}`);
  } else {
    const lead = await prisma.lead.findUnique({ where: { id: entityId } });
    if (!lead) throw new Error("Lead não encontrado");

    await prisma.lead.update({
      where: { id: entityId },
      data: { inOperationsAt: null },
    });

    revalidatePath("/admin/operations");
    revalidatePath(`/leads/${entityId}`);
  }
}
