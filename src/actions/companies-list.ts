"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type CompanyOption = {
  id: string;
  name: string;
  type: "lead" | "organization";
  status?: string; // For leads
};

/**
 * Get unified list of companies (both Leads and Organizations)
 * for contact linking
 */
export async function getCompaniesList(): Promise<CompanyOption[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return [];
  }

  // Get active leads (not converted yet)
  const leads = await prisma.lead.findMany({
    where: {
      ownerId: session.user.id,
      convertedAt: null, // Only unconverted leads
      status: { not: "disqualified" },
    },
    select: {
      id: true,
      businessName: true,
      status: true,
    },
    orderBy: {
      businessName: "asc",
    },
  });

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    where: {
      ownerId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Combine both lists
  const companies: CompanyOption[] = [
    ...leads.map((lead) => ({
      id: lead.id,
      name: lead.businessName,
      type: "lead" as const,
      status: lead.status,
    })),
    ...organizations.map((org) => ({
      id: org.id,
      name: org.name,
      type: "organization" as const,
    })),
  ];

  // Sort alphabetically
  companies.sort((a, b) => a.name.localeCompare(b.name));

  return companies;
}
