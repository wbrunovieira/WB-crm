import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { backendFetch } from "@/lib/backend/client";
import type { UserListItem } from "@/hooks/users/use-users";

import { ContactsListClient } from "@/components/contacts/ContactsListClient";

export default async function ContactsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id ?? "";

  // Dados que ainda vivem no Next.js (não migrados ao NestJS)
  const users = await backendFetch<UserListItem[]>('/users');

  return (
    <ContactsListClient
      isAdmin={isAdmin}
      currentUserId={currentUserId}
      users={users}
      // sharedUsersMap é carregado pelo próprio client depois que contacts carregar
    />
  );
}
