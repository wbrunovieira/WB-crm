"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ========== GET DEAL TECH STACK ==========

export async function getDealTechStack(dealId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const [categories, languages, frameworks] = await Promise.all([
    prisma.dealTechStack.findMany({
      where: { dealId },
      include: {
        techCategory: true,
      },
    }),
    prisma.dealLanguage.findMany({
      where: { dealId },
      include: {
        language: true,
      },
      orderBy: [{ isPrimary: "desc" }, { language: { name: "asc" } }],
    }),
    prisma.dealFramework.findMany({
      where: { dealId },
      include: {
        framework: true,
      },
    }),
  ]);

  return {
    categories,
    languages,
    frameworks,
  };
}

// ========== TECH CATEGORIES ==========

export async function addCategoryToDeal(dealId: string, categoryId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check if already exists
  const existing = await prisma.dealTechStack.findUnique({
    where: {
      dealId_techCategoryId: {
        dealId,
        techCategoryId: categoryId,
      },
    },
  });

  if (existing) {
    throw new Error("Esta categoria já está vinculada ao deal");
  }

  const link = await prisma.dealTechStack.create({
    data: {
      dealId,
      techCategoryId: categoryId,
    },
    include: {
      techCategory: true,
    },
  });

  revalidatePath(`/deals/${dealId}`);
  return link;
}

export async function removeCategoryFromDeal(dealId: string, categoryId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.dealTechStack.delete({
    where: {
      dealId_techCategoryId: {
        dealId,
        techCategoryId: categoryId,
      },
    },
  });

  revalidatePath(`/deals/${dealId}`);
}

// ========== LANGUAGES ==========

export async function addLanguageToDeal(
  dealId: string,
  languageId: string,
  isPrimary: boolean = false
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check if already exists
  const existing = await prisma.dealLanguage.findUnique({
    where: {
      dealId_languageId: {
        dealId,
        languageId,
      },
    },
  });

  if (existing) {
    throw new Error("Esta linguagem já está vinculada ao deal");
  }

  // If setting as primary, unset other primaries
  if (isPrimary) {
    await prisma.dealLanguage.updateMany({
      where: { dealId },
      data: { isPrimary: false },
    });
  }

  const link = await prisma.dealLanguage.create({
    data: {
      dealId,
      languageId,
      isPrimary,
    },
    include: {
      language: true,
    },
  });

  revalidatePath(`/deals/${dealId}`);
  return link;
}

export async function removeLanguageFromDeal(dealId: string, languageId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.dealLanguage.delete({
    where: {
      dealId_languageId: {
        dealId,
        languageId,
      },
    },
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function setPrimaryLanguage(dealId: string, languageId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Unset all primaries for this deal
  await prisma.dealLanguage.updateMany({
    where: { dealId },
    data: { isPrimary: false },
  });

  // Set the new primary
  await prisma.dealLanguage.update({
    where: {
      dealId_languageId: {
        dealId,
        languageId,
      },
    },
    data: { isPrimary: true },
  });

  revalidatePath(`/deals/${dealId}`);
}

// ========== FRAMEWORKS ==========

export async function addFrameworkToDeal(dealId: string, frameworkId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check if already exists
  const existing = await prisma.dealFramework.findUnique({
    where: {
      dealId_frameworkId: {
        dealId,
        frameworkId,
      },
    },
  });

  if (existing) {
    throw new Error("Este framework já está vinculado ao deal");
  }

  const link = await prisma.dealFramework.create({
    data: {
      dealId,
      frameworkId,
    },
    include: {
      framework: true,
    },
  });

  revalidatePath(`/deals/${dealId}`);
  return link;
}

export async function removeFrameworkFromDeal(dealId: string, frameworkId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.dealFramework.delete({
    where: {
      dealId_frameworkId: {
        dealId,
        frameworkId,
      },
    },
  });

  revalidatePath(`/deals/${dealId}`);
}
