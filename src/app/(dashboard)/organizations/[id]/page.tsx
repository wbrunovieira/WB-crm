import { getOrganizationById } from "@/actions/organizations";
import { DeleteOrganizationButton } from "@/components/organizations/DeleteOrganizationButton";
import { OrganizationProjects } from "@/components/organizations/OrganizationProjects";
import { OrganizationActivities } from "@/components/organizations/OrganizationActivities";
import { OrganizationTechProfileSection } from "@/components/organizations/OrganizationTechProfileSection";
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
              <dt className="text-sm font-medium text-gray-500">Nome Fantasia</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Razão Social</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization.legalName || "-"}
              </dd>
            </div>
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

      {/* Contacts, Deals, and Projects */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Contatos ({organization.contacts.length})
            </h2>
            <Link
              href={`/contacts/new?organizationId=${organization.id}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              + Novo Contato
            </Link>
          </div>
          {organization.contacts.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">Nenhum contato vinculado</p>
              <Link
                href={`/contacts/new?organizationId=${organization.id}`}
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Criar Primeiro Contato
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {organization.contacts.map((contact) => (
                <li key={contact.id} className="text-sm">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="font-medium text-gray-100 hover:text-purple-200 hover:underline"
                  >
                    {contact.name}
                  </Link>
                  {contact.email && (
                    <span className="ml-2 text-gray-400">
                      • {contact.email}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Negócios ({organization.deals.length})
            </h2>
            <Link
              href={`/deals/new?organizationId=${organization.id}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              + Novo Negócio
            </Link>
          </div>
          {organization.deals.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">Nenhum negócio vinculado</p>
              <Link
                href={`/deals/new?organizationId=${organization.id}`}
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Criar Primeiro Negócio
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {organization.deals.map((deal) => (
                <li key={deal.id} className="text-sm">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="font-medium text-gray-100 hover:text-purple-200 hover:underline"
                  >
                    {deal.title}
                  </Link>
                  <span className="ml-2 text-gray-400">
                    • {deal.stage.name} • R${" "}
                    {deal.value.toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tech Profile */}
      <div className="mt-6">
        <OrganizationTechProfileSection organizationId={organization.id} />
      </div>

      {/* Activities */}
      <div className="mt-6">
        <OrganizationActivities
          activities={organization.activities}
          organizationId={organization.id}
        />
      </div>

      {/* Projects */}
      <div className="mt-6">
        <OrganizationProjects
          projectIds={
            organization.externalProjectIds
              ? JSON.parse(organization.externalProjectIds)
              : []
          }
          organizationId={organization.id}
        />
      </div>
    </div>
  );
}
