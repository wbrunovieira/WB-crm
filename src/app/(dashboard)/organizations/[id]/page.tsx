import { getOrganizationById } from "@/actions/organizations";
import { DeleteOrganizationButton } from "@/components/organizations/DeleteOrganizationButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Website</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.website ? (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {organization.website}
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Telefone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.phone || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Setor</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.industry || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">CNPJ</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.taxId || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Criado em</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(organization.createdAt)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Location */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Localização</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Endereço</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.streetAddress || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Cidade</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.city || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Estado</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.state || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">CEP</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.zipCode || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">País</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.country || "-"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Business Info & Social */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">
              Informações de Negócio
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Funcionários
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {organization.employeeCount || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Receita Anual
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {organization.annualRevenue
                    ? `R$ ${organization.annualRevenue.toLocaleString("pt-BR")}`
                    : "-"}
                </dd>
              </div>
              {organization.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Descrição
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {organization.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Redes Sociais</h2>
            <dl className="space-y-4">
              {organization.instagram && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Instagram
                  </dt>
                  <dd className="mt-1 text-sm text-primary">
                    {organization.instagram}
                  </dd>
                </div>
              )}
              {organization.linkedin && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    LinkedIn
                  </dt>
                  <dd className="mt-1 text-sm text-primary">
                    {organization.linkedin}
                  </dd>
                </div>
              )}
              {organization.facebook && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Facebook
                  </dt>
                  <dd className="mt-1 text-sm text-primary">
                    {organization.facebook}
                  </dd>
                </div>
              )}
              {organization.twitter && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Twitter/X
                  </dt>
                  <dd className="mt-1 text-sm text-primary">
                    {organization.twitter}
                  </dd>
                </div>
              )}
              {!organization.instagram &&
                !organization.linkedin &&
                !organization.facebook &&
                !organization.twitter && (
                  <p className="text-sm text-gray-500">
                    Nenhuma rede social cadastrada
                  </p>
                )}
            </dl>
          </div>
        </div>
      </div>

      {/* Contacts and Deals */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
  );
}
