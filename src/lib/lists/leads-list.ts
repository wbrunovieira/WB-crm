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
      convertedAt: null,
      isArchived: false,
    },
    select: {
      id: true,
      businessName: true,
      leadContacts: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isPrimary: true,
        },
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      },
    },
    orderBy: {
      businessName: "asc",
    },
  });

  return leads;
}
