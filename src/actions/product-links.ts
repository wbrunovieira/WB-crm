"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  leadProductSchema,
  organizationProductSchema,
  dealProductSchema,
  partnerProductSchema,
  type LeadProductFormData,
  type OrganizationProductFormData,
  type DealProductFormData,
  type PartnerProductFormData,
} from "@/lib/validations/product";

// ========== LEAD PRODUCTS ==========

export async function addProductToLead(data: LeadProductFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = leadProductSchema.parse(data);

  // Verificar se já existe
  const existing = await prisma.leadProduct.findUnique({
    where: {
      leadId_productId: {
        leadId: validated.leadId,
        productId: validated.productId,
      },
    },
  });

  if (existing) {
    throw new Error("Este produto já está vinculado ao lead");
  }

  const leadProduct = await prisma.leadProduct.create({
    data: validated,
  });

  revalidatePath(`/leads/${validated.leadId}`);
  return leadProduct;
}

export async function updateLeadProduct(
  id: string,
  data: Partial<LeadProductFormData>
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const leadProduct = await prisma.leadProduct.update({
    where: { id },
    data: {
      interestLevel: data.interestLevel,
      estimatedValue: data.estimatedValue,
      notes: data.notes,
    },
  });

  const lead = await prisma.leadProduct.findUnique({
    where: { id },
    select: { leadId: true },
  });

  if (lead) {
    revalidatePath(`/leads/${lead.leadId}`);
  }

  return leadProduct;
}

export async function removeProductFromLead(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const leadProduct = await prisma.leadProduct.findUnique({
    where: { id },
    select: { leadId: true },
  });

  await prisma.leadProduct.delete({
    where: { id },
  });

  if (leadProduct) {
    revalidatePath(`/leads/${leadProduct.leadId}`);
  }
}

export async function getLeadProducts(leadId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const leadProducts = await prisma.leadProduct.findMany({
    where: { leadId },
    include: {
      product: {
        include: {
          businessLine: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return leadProducts;
}

// ========== ORGANIZATION PRODUCTS ==========

export async function addProductToOrganization(
  data: OrganizationProductFormData
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = organizationProductSchema.parse(data);

  const existing = await prisma.organizationProduct.findUnique({
    where: {
      organizationId_productId: {
        organizationId: validated.organizationId,
        productId: validated.productId,
      },
    },
  });

  if (existing) {
    throw new Error("Este produto já está vinculado à organização");
  }

  const orgProduct = await prisma.organizationProduct.create({
    data: validated,
  });

  revalidatePath(`/organizations/${validated.organizationId}`);
  return orgProduct;
}

export async function updateOrganizationProduct(
  id: string,
  data: Partial<OrganizationProductFormData>
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const orgProduct = await prisma.organizationProduct.update({
    where: { id },
    data,
  });

  const org = await prisma.organizationProduct.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  if (org) {
    revalidatePath(`/organizations/${org.organizationId}`);
  }

  return orgProduct;
}

export async function removeProductFromOrganization(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const orgProduct = await prisma.organizationProduct.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  await prisma.organizationProduct.delete({
    where: { id },
  });

  if (orgProduct) {
    revalidatePath(`/organizations/${orgProduct.organizationId}`);
  }
}

export async function getOrganizationProducts(organizationId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const orgProducts = await prisma.organizationProduct.findMany({
    where: { organizationId },
    include: {
      product: {
        include: {
          businessLine: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orgProducts;
}

// ========== DEAL PRODUCTS ==========

export async function addProductToDeal(data: DealProductFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = dealProductSchema.parse(data);

  const existing = await prisma.dealProduct.findUnique({
    where: {
      dealId_productId: {
        dealId: validated.dealId,
        productId: validated.productId,
      },
    },
  });

  if (existing) {
    throw new Error("Este produto já está vinculado ao deal");
  }

  const dealProduct = await prisma.dealProduct.create({
    data: validated,
  });

  revalidatePath(`/deals/${validated.dealId}`);
  return dealProduct;
}

export async function updateDealProduct(
  id: string,
  data: Partial<DealProductFormData>
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const dealProduct = await prisma.dealProduct.update({
    where: { id },
    data,
  });

  const deal = await prisma.dealProduct.findUnique({
    where: { id },
    select: { dealId: true },
  });

  if (deal) {
    revalidatePath(`/deals/${deal.dealId}`);
  }

  return dealProduct;
}

export async function removeProductFromDeal(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const dealProduct = await prisma.dealProduct.findUnique({
    where: { id },
    select: { dealId: true },
  });

  await prisma.dealProduct.delete({
    where: { id },
  });

  if (dealProduct) {
    revalidatePath(`/deals/${dealProduct.dealId}`);
  }
}

export async function getDealProducts(dealId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const dealProducts = await prisma.dealProduct.findMany({
    where: { dealId },
    include: {
      product: {
        include: {
          businessLine: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return dealProducts;
}

// ========== PARTNER PRODUCTS ==========

export async function addProductToPartner(data: PartnerProductFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = partnerProductSchema.parse(data);

  const existing = await prisma.partnerProduct.findUnique({
    where: {
      partnerId_productId: {
        partnerId: validated.partnerId,
        productId: validated.productId,
      },
    },
  });

  if (existing) {
    throw new Error("Este produto já está vinculado ao parceiro");
  }

  const partnerProduct = await prisma.partnerProduct.create({
    data: validated,
  });

  revalidatePath(`/partners/${validated.partnerId}`);
  return partnerProduct;
}

export async function updatePartnerProduct(
  id: string,
  data: Partial<PartnerProductFormData>
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const partnerProduct = await prisma.partnerProduct.update({
    where: { id },
    data,
  });

  const partner = await prisma.partnerProduct.findUnique({
    where: { id },
    select: { partnerId: true },
  });

  if (partner) {
    revalidatePath(`/partners/${partner.partnerId}`);
  }

  return partnerProduct;
}

export async function removeProductFromPartner(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const partnerProduct = await prisma.partnerProduct.findUnique({
    where: { id },
    select: { partnerId: true },
  });

  await prisma.partnerProduct.delete({
    where: { id },
  });

  if (partnerProduct) {
    revalidatePath(`/partners/${partnerProduct.partnerId}`);
  }
}

export async function getPartnerProducts(partnerId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const partnerProducts = await prisma.partnerProduct.findMany({
    where: { partnerId },
    include: {
      product: {
        include: {
          businessLine: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return partnerProducts;
}
