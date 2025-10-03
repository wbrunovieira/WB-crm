"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getLeadsList() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return [];
  }

  const leads = await prisma.lead.findMany({
    where: {
      ownerId: session.user.id,
      status: { not: "disqualified" }, // Only show active leads
    },
    select: {
      id: true,
      businessName: true,
    },
    orderBy: {
      businessName: "asc",
    },
  });

  return leads;
}

export async function getLeadContactsList(leadId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return [];
  }

  const leadContacts = await prisma.leadContact.findMany({
    where: {
      leadId,
      lead: {
        ownerId: session.user.id,
      },
      convertedToContactId: null, // Only show unconverted lead contacts
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return leadContacts;
}
