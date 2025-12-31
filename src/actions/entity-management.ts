"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ==================== Types ====================

export type EntityType = "lead" | "contact" | "organization" | "partner" | "deal";

export interface TransferResult {
  success: boolean;
  message: string;
}

export interface ShareResult {
  success: boolean;
  message: string;
}

export interface SharedUser {
  id: string;
  sharedWithUser: {
    id: string;
    name: string;
    email: string;
  };
  sharedByUser: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

interface EntityWithOwner {
  id: string;
  ownerId: string;
}

interface EntityWithOwnerIncluded {
  id: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

// ==================== Helper Functions ====================

/**
 * Get the revalidation path for an entity type
 */
function getRevalidationPath(entityType: EntityType): string {
  switch (entityType) {
    case "lead":
      return "/leads";
    case "contact":
      return "/contacts";
    case "organization":
      return "/organizations";
    case "partner":
      return "/partners";
    case "deal":
      return "/deals";
  }
}

/**
 * Get entity type label in Portuguese
 */
function getEntityLabel(entityType: EntityType): string {
  switch (entityType) {
    case "lead":
      return "Lead";
    case "contact":
      return "Contato";
    case "organization":
      return "Organização";
    case "partner":
      return "Parceiro";
    case "deal":
      return "Negócio";
  }
}

/**
 * Find entity by type and id
 */
async function findEntity(
  entityType: EntityType,
  entityId: string
): Promise<EntityWithOwner | null> {
  switch (entityType) {
    case "lead":
      return prisma.lead.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true },
      });
    case "contact":
      return prisma.contact.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true },
      });
    case "organization":
      return prisma.organization.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true },
      });
    case "partner":
      return prisma.partner.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true },
      });
    case "deal":
      return prisma.deal.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true },
      });
  }
}

/**
 * Find entity with owner included
 */
async function findEntityWithOwner(
  entityType: EntityType,
  entityId: string
): Promise<EntityWithOwnerIncluded | null> {
  const ownerSelect = {
    select: {
      id: true,
      name: true,
      email: true,
    },
  };

  switch (entityType) {
    case "lead":
      return prisma.lead.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, owner: ownerSelect },
      });
    case "contact":
      return prisma.contact.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, owner: ownerSelect },
      });
    case "organization":
      return prisma.organization.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, owner: ownerSelect },
      });
    case "partner":
      return prisma.partner.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, owner: ownerSelect },
      });
    case "deal":
      return prisma.deal.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, owner: ownerSelect },
      });
  }
}

/**
 * Update entity owner
 */
async function updateEntityOwner(
  entityType: EntityType,
  entityId: string,
  newOwnerId: string
): Promise<void> {
  switch (entityType) {
    case "lead":
      await prisma.lead.update({
        where: { id: entityId },
        data: { ownerId: newOwnerId },
      });
      break;
    case "contact":
      await prisma.contact.update({
        where: { id: entityId },
        data: { ownerId: newOwnerId },
      });
      break;
    case "organization":
      await prisma.organization.update({
        where: { id: entityId },
        data: { ownerId: newOwnerId },
      });
      break;
    case "partner":
      await prisma.partner.update({
        where: { id: entityId },
        data: { ownerId: newOwnerId },
      });
      break;
    case "deal":
      await prisma.deal.update({
        where: { id: entityId },
        data: { ownerId: newOwnerId },
      });
      break;
  }
}

// ==================== Transfer Functions ====================

/**
 * Transfer ownership of an entity to another user
 * Only admins can transfer entities
 */
export async function transferEntity(
  entityType: EntityType,
  entityId: string,
  newOwnerId: string
): Promise<TransferResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Only admin can transfer
  if (session.user.role?.toLowerCase() !== "admin") {
    throw new Error("Apenas administradores podem transferir entidades");
  }

  // Find the entity
  const entity = await findEntity(entityType, entityId);

  if (!entity) {
    throw new Error("Entidade não encontrada");
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: newOwnerId },
  });

  if (!targetUser) {
    throw new Error("Usuário de destino não encontrado");
  }

  // Update the entity owner
  await updateEntityOwner(entityType, entityId, newOwnerId);

  // Remove all existing shares for this entity (since ownership changed)
  await prisma.sharedEntity.deleteMany({
    where: {
      entityType,
      entityId,
    },
  });

  // Revalidate paths
  const basePath = getRevalidationPath(entityType);
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${entityId}`);

  return {
    success: true,
    message: `${getEntityLabel(entityType)} transferido para ${targetUser.name}`,
  };
}

// ==================== Sharing Functions ====================

/**
 * Share an entity with another user
 * Only admins can share entities
 */
export async function shareEntity(
  entityType: EntityType,
  entityId: string,
  userId: string
): Promise<ShareResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Only admin can share
  if (session.user.role?.toLowerCase() !== "admin") {
    throw new Error("Apenas administradores podem compartilhar entidades");
  }

  // Find the entity
  const entity = await findEntity(entityType, entityId);

  if (!entity) {
    throw new Error("Entidade não encontrada");
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new Error("Usuário não encontrado");
  }

  // Cannot share with the owner
  if (entity.ownerId === userId) {
    throw new Error("Não é possível compartilhar com o próprio dono");
  }

  // Check if already shared
  const existingShare = await prisma.sharedEntity.findFirst({
    where: {
      entityType,
      entityId,
      sharedWithUserId: userId,
    },
  });

  if (existingShare) {
    throw new Error("Entidade já compartilhada com este usuário");
  }

  // Create the share
  await prisma.sharedEntity.create({
    data: {
      entityType,
      entityId,
      sharedWithUserId: userId,
      sharedByUserId: session.user.id,
    },
  });

  // Revalidate paths
  const basePath = getRevalidationPath(entityType);
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${entityId}`);

  return {
    success: true,
    message: `${getEntityLabel(entityType)} compartilhado com ${targetUser.name}`,
  };
}

/**
 * Remove a share from an entity
 * Only admins can remove shares
 */
export async function unshareEntity(
  entityType: EntityType,
  entityId: string,
  userId: string
): Promise<ShareResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Only admin can unshare
  if (session.user.role?.toLowerCase() !== "admin") {
    throw new Error("Apenas administradores podem remover compartilhamentos");
  }

  // Find the share
  const share = await prisma.sharedEntity.findFirst({
    where: {
      entityType,
      entityId,
      sharedWithUserId: userId,
    },
  });

  if (!share) {
    throw new Error("Compartilhamento não encontrado");
  }

  // Delete the share
  await prisma.sharedEntity.delete({
    where: { id: share.id },
  });

  // Revalidate paths
  const basePath = getRevalidationPath(entityType);
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${entityId}`);

  return {
    success: true,
    message: "Compartilhamento removido",
  };
}

/**
 * Get all users with whom an entity is shared
 */
export async function getSharedUsers(
  entityType: EntityType,
  entityId: string
): Promise<SharedUser[]> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const shares = await prisma.sharedEntity.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      sharedWithUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      sharedByUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return shares.map((share) => ({
    id: share.id,
    sharedWithUser: share.sharedWithUser,
    sharedByUser: share.sharedByUser,
    createdAt: share.createdAt,
  }));
}

/**
 * Get all users available for sharing (excluding owner and already shared)
 */
export async function getAvailableUsersForSharing(
  entityType: EntityType,
  entityId: string
): Promise<{ id: string; name: string; email: string }[]> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Get the entity to find its owner
  const entity = await findEntity(entityType, entityId);

  if (!entity) {
    throw new Error("Entidade não encontrada");
  }

  // Get already shared user IDs
  const existingShares = await prisma.sharedEntity.findMany({
    where: {
      entityType,
      entityId,
    },
    select: {
      sharedWithUserId: true,
    },
  });

  const excludedUserIds = [
    entity.ownerId,
    ...existingShares.map((s) => s.sharedWithUserId),
  ];

  // Get available users
  const users = await prisma.user.findMany({
    where: {
      id: {
        notIn: excludedUserIds,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return users;
}

/**
 * Get all users for transfer selection
 */
export async function getUsersForTransfer(
  currentOwnerId: string
): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Only admin can transfer
  if (session.user.role?.toLowerCase() !== "admin") {
    throw new Error("Apenas administradores podem transferir entidades");
  }

  // Get all users except current owner
  const users = await prisma.user.findMany({
    where: {
      id: {
        not: currentOwnerId,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return users;
}

/**
 * Get entity owner information
 */
export async function getEntityOwner(
  entityType: EntityType,
  entityId: string
): Promise<{ id: string; name: string; email: string } | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const entity = await findEntityWithOwner(entityType, entityId);

  if (!entity) {
    return null;
  }

  return entity.owner;
}

/**
 * Get shared users for multiple entities at once (batch query)
 * Returns a map of entityId -> array of shared users
 */
export async function getSharedUsersForEntities(
  entityType: EntityType,
  entityIds: string[]
): Promise<Record<string, { id: string; name: string }[]>> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  if (entityIds.length === 0) {
    return {};
  }

  const shares = await prisma.sharedEntity.findMany({
    where: {
      entityType,
      entityId: { in: entityIds },
    },
    include: {
      sharedWithUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by entityId
  const result: Record<string, { id: string; name: string }[]> = {};

  for (const share of shares) {
    if (!result[share.entityId]) {
      result[share.entityId] = [];
    }
    result[share.entityId].push({
      id: share.sharedWithUser.id,
      name: share.sharedWithUser.name,
    });
  }

  return result;
}
