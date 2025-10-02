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
      convertedAt: null, // Only non-converted leads
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
