import { getOrganizationById } from "@/actions/organizations";
import { DeleteOrganizationButton } from "@/components/organizations/DeleteOrganizationButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function OrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const organization = await getOrganizationById(params.id);

  if (!organization) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="mt-2 text-gray-600">Detalhes da organização</p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/organizations/${organization.id}/edit`}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
          <DeleteOrganizationButton organizationId={organization.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Domínio</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.domain || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Telefone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.phone || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Endereço</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.address || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Criado em</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(organization.createdAt), "PPP 'às' HH:mm", {
                  locale: ptBR,
                })}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Contatos ({organization.contacts.length})
              </h2>
              <Link
                href={`/contacts/new?organizationId=${organization.id}`}
                className="text-sm text-primary hover:text-blue-700"
              >
                + Adicionar
              </Link>
            </div>
            {organization.contacts.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum contato vinculado</p>
            ) : (
              <ul className="space-y-2">
                {organization.contacts.map((contact) => (
                  <li key={contact.id} className="text-sm">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-primary hover:underline"
                    >
                      {contact.name}
                    </Link>
                    {contact.email && (
                      <span className="ml-2 text-gray-500">
                        • {contact.email}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">
              Negócios ({organization.deals.length})
            </h2>
            {organization.deals.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum negócio vinculado</p>
            ) : (
              <ul className="space-y-2">
                {organization.deals.map((deal) => (
                  <li key={deal.id} className="text-sm">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-primary hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <span className="ml-2 text-gray-500">
                      • {deal.stage.name} • R${" "}
                      {deal.value.toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
