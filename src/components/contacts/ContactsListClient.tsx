"use client";

import { useContacts } from "@/hooks/contacts/use-contacts";
import { ContactCard } from "./ContactCard";
import { ContactsFilters } from "./ContactsFilters";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { UserListItem } from "@/hooks/users/use-users";

interface Props {
  isAdmin: boolean;
  currentUserId: string;
  users: UserListItem[];
}

export function ContactsListClient({ isAdmin, currentUserId, users }: Props) {
  const searchParams = useSearchParams();

  const filters = {
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
  };

  const groupBy = searchParams.get("groupBy") ?? "";

  const { data: contacts = [], isLoading, isError } = useContacts(filters);

  const grouped = (): Record<string, typeof contacts> => {
    if (!groupBy) return { "Todos os contatos": contacts };

    const groups: Record<string, typeof contacts> = {};
    contacts.forEach((contact) => {
      let key: string;
      if (groupBy === "organization") {
        key = contact.organization?.name || contact.lead?.businessName || contact.partner?.name || "Sem empresa";
      } else if (groupBy === "department") {
        key = contact.department || "Sem departamento";
      } else if (groupBy === "status") {
        key = contact.status === "active" ? "Ativos" : contact.status === "inactive" ? "Inativos" : "Bounced";
      } else {
        key = "Todos os contatos";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(contact);
    });
    return groups;
  };

  const groups = grouped();
  const totalContacts = contacts.length;
  const activeContacts = contacts.filter((c) => c.status === "active").length;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Contatos</h1>
                {!isLoading && (
                  <p className="mt-1 text-sm text-gray-600">
                    {totalContacts} {totalContacts === 1 ? "contato" : "contatos"} •{" "}
                    {activeContacts} {activeContacts === 1 ? "ativo" : "ativos"}
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/contacts/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo Contato
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <ContactsFilters />
          {isAdmin && users.length > 0 && (
            <OwnerFilter users={users} currentUserId={currentUserId} />
          )}
        </div>

        {/* States */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
            Erro ao carregar contatos. Tente recarregar a página.
          </div>
        )}

        {!isLoading && !isError && totalContacts === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <Users className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum contato encontrado</h3>
            <p className="mt-2 text-sm text-gray-500">
              {filters.search || filters.status || filters.company
                ? "Tente ajustar os filtros ou busca."
                : "Comece criando seu primeiro contato."}
            </p>
            <Link
              href="/contacts/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Criar Contato
            </Link>
          </div>
        )}

        {!isLoading && !isError && totalContacts > 0 && (
          <div className="space-y-8">
            {Object.entries(groups).map(([groupName, groupContacts]) => (
              <div key={groupName}>
                {groupBy && (
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {groupName}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {groupContacts.length}
                    </span>
                  </h2>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      showOwnerBadge={isAdmin}
                      currentUserId={currentUserId}
                      sharedWith={[]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
