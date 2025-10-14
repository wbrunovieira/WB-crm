"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  productSchema,
  productUpdateSchema,
  type ProductFormData,
  type ProductUpdateData,
} from "@/lib/validations/product";

export async function getProducts(businessLineId?: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const products = await prisma.product.findMany({
    where: businessLineId ? { businessLineId } : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      businessLine: true,
      _count: {
        select: {
          leadProducts: true,
          organizationProducts: true,
          dealProducts: true,
          partnerProducts: true,
        },
      },
    },
  });

  return products;
}

export async function getActiveProducts(businessLineId?: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      businessLineId: businessLineId || undefined,
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      businessLine: true,
    },
  });

  return products;
}

export async function getProductById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      businessLine: true,
      _count: {
        select: {
          leadProducts: true,
          organizationProducts: true,
          dealProducts: true,
          partnerProducts: true,
        },
      },
    },
  });

  return product;
}

export async function createProduct(data: ProductFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = productSchema.parse(data);

  // Verificar se slug já existe
  const existing = await prisma.product.findUnique({
    where: { slug: validated.slug },
  });

  if (existing) {
    throw new Error("Já existe um produto com este slug");
  }

  // Verificar se a linha de negócio existe
  const businessLine = await prisma.businessLine.findUnique({
    where: { id: validated.businessLineId },
  });

  if (!businessLine) {
    throw new Error("Linha de negócio não encontrada");
  }

  const product = await prisma.product.create({
    data: validated,
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/business-lines");
  return product;
}

export async function updateProduct(data: ProductUpdateData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = productUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  // Se slug foi alterado, verificar se já existe
  if (updateData.slug) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: updateData.slug,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("Já existe um produto com este slug");
    }
  }

  // Se businessLineId foi alterado, verificar se existe
  if (updateData.businessLineId) {
    const businessLine = await prisma.businessLine.findUnique({
      where: { id: updateData.businessLineId },
    });

    if (!businessLine) {
      throw new Error("Linha de negócio não encontrada");
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/business-lines");
  return product;
}

export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Verificar se tem vínculos
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          leadProducts: true,
          organizationProducts: true,
          dealProducts: true,
          partnerProducts: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const totalLinks =
    product._count.leadProducts +
    product._count.organizationProducts +
    product._count.dealProducts +
    product._count.partnerProducts;

  if (totalLinks > 0) {
    throw new Error("Não é possível excluir um produto com vínculos ativos");
  }

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/business-lines");
}

export async function toggleProductActive(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/business-lines");
  return updated;
}
