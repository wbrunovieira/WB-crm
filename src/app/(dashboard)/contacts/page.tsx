import { getContacts } from "@/actions/contacts";
import { ContactsFilters } from "@/components/contacts/ContactsFilters";
import { ContactCard } from "@/components/contacts/ContactCard";
import Link from "next/link";
import { Users, Plus } from "lucide-react";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    status?: string;
    company?: string;
    groupBy?: string;
  };
}) {
  const contacts = await getContacts({
    search: searchParams.search,
    status: searchParams.status,
    company: searchParams.company,
  });

  // Group contacts based on groupBy parameter
  const groupedContacts = () => {
    if (!searchParams.groupBy || searchParams.groupBy === "") {
      return { "Todos os contatos": contacts };
    }

    const groups: Record<string, typeof contacts> = {};

    if (searchParams.groupBy === "organization") {
      contacts.forEach((contact) => {
        const key = contact.organization?.name || contact.lead?.businessName || contact.partner?.name || "Sem empresa";
        if (!groups[key]) groups[key] = [];
        groups[key].push(contact);
      });
    } else if (searchParams.groupBy === "department") {
      contacts.forEach((contact) => {
        const key = contact.department || "Sem departamento";
        if (!groups[key]) groups[key] = [];
        groups[key].push(contact);
      });
    } else if (searchParams.groupBy === "status") {
      contacts.forEach((contact) => {
        const key =
          contact.status === "active"
            ? "Ativos"
            : contact.status === "inactive"
              ? "Inativos"
              : "Bounced";
        if (!groups[key]) groups[key] = [];
        groups[key].push(contact);
      });
    }

    return groups;
  };

  const groups = groupedContacts();
  const totalContacts = contacts.length;
  const activeContacts = contacts.filter((c) => c.status === "active").length;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Contatos</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    {totalContacts} {totalContacts === 1 ? "contato" : "contatos"} •{" "}
                    {activeContacts} {activeContacts === 1 ? "ativo" : "ativos"}
                  </p>
                </div>
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
        <ContactsFilters />

        {/* Content */}
        {totalContacts === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <Users className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Nenhum contato encontrado
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchParams.search || searchParams.status || searchParams.company
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
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([groupName, groupContacts]) => (
              <div key={groupName}>
                {searchParams.groupBy && (
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary"></span>
                    {groupName}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {groupContacts.length}
                    </span>
                  </h2>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupContacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
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
