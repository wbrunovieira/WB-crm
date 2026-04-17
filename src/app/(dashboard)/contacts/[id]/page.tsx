import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContactDetailClient } from "@/components/contacts/ContactDetailClient";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  return <ContactDetailClient id={params.id} isAdmin={isAdmin} />;
}
