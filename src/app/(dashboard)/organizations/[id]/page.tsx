import { getOrganizationById } from "@/actions/organizations";
import { getMeetings } from "@/actions/meetings";
import MeetingsList from "@/components/meetings/MeetingsList";
import GmailButton from "@/components/gmail/GmailButton";
import GmailSyncButton from "@/components/gmail/GmailSyncButton";
import { PhoneLink } from "@/components/ui/phone-link";
import { DeleteOrganizationButton } from "@/components/organizations/DeleteOrganizationButton";
import { OrganizationProjects } from "@/components/organizations/OrganizationProjects";
import { OrganizationActivities } from "@/components/organizations/OrganizationActivities";
import { OrganizationTechProfileSection } from "@/components/organizations/OrganizationTechProfileSection";
import { OrganizationICPSection } from "@/components/icps/OrganizationICPSection";
import { SecondaryCNAEsManager } from "@/components/shared/SecondaryCNAEsManager";
import { EntityManagementPanel } from "@/components/shared/entity-management";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OrganizationContactsList } from "@/components/organizations/OrganizationContactsList";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { LanguageBadges } from "@/components/shared/LanguageSelector";

export default async function OrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [organization, session, meetings] = await Promise.all([
    getOrganizationById(params.id),
    getServerSession(authOptions),
    getMeetings({ organizationId: params.id }),
  ]);

  if (!organization) {
    notFound();
  }

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

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

      {organization.inOperationsAt && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-amber-800">In Operations</span>
            <span className="text-amber-700">since {formatDate(organization.inOperationsAt)}</span>
            <span className="text-amber-600 text-sm">
              — automated communication activities are paused
            </span>
          </div>
        </div>
      )}

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
            {organization.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                  <a href={`mailto:${organization.email}`} className="hover:text-primary hover:underline">
                    {organization.email}
                  </a>
                  <GmailButton
                    to={organization.email}
                    name={organization.name}
                    organizationId={organization.id}
                    variant="icon"
                  />
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Telefone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <PhoneLink phone={organization.phone} className="text-gray-900 hover:text-primary" />
                {!organization.phone && "-"}
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
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Idiomas</dt>
              <dd className="mt-1"><LanguageBadges languages={organization.languages} /></dd>
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
        <OrganizationContactsList
          organizationId={organization.id}
          contacts={organization.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            status: c.status,
            languages: c.languages,
          }))}
        />

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

      {/* ICP Section */}
      <div className="mt-6">
        <OrganizationICPSection organizationId={organization.id} />
      </div>

      {/* CNAE Management */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Atividades Econômicas (CNAE)</h2>
        {organization.primaryCNAE && (
          <div className="mb-6 rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">
              Atividade Primária
            </dt>
            <dd className="flex items-center gap-3">
              <span className="rounded-md bg-white px-3 py-1 font-mono text-sm font-bold text-purple-900 shadow-sm">
                {organization.primaryCNAE.code}
              </span>
              <span className="text-base font-medium text-gray-900">
                {organization.primaryCNAE.description}
              </span>
            </dd>
          </div>
        )}
        {organization.internationalActivity && (
          <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Atividade Internacional
            </dt>
            <dd className="text-base font-medium text-gray-900">
              {organization.internationalActivity}
            </dd>
          </div>
        )}
        <div className="mt-6">
          <SecondaryCNAEsManager
            entityId={organization.id}
            entityType="organization"
          />
        </div>
      </div>

      {/* Meetings */}
      <div className="mt-6">
        <MeetingsList
          meetings={meetings}
          organizationId={organization.id}
          suggestedContacts={[
            ...(organization.email
              ? [{ id: `org-${organization.id}`, name: organization.name, email: organization.email, role: "Empresa" }]
              : []),
            ...organization.contacts
              .filter((c) => c.email)
              .map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email!,
                role: undefined,
              })),
          ]}
        />
      </div>

      {/* Activities */}
      <div className="mt-6">
        <div className="mb-3 flex justify-end">
          <GmailSyncButton revalidateUrl={`/organizations/${organization.id}`} />
        </div>
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
        />
      </div>

      {/* Entity Management Panel (Admin Only) */}
      {isAdmin && organization.owner && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Gerenciamento de Acesso</h2>
          <EntityManagementPanel
            entityType="organization"
            entityId={organization.id}
            entityName={organization.name}
            ownerId={organization.owner.id}
            ownerName={organization.owner.name}
            ownerEmail={organization.owner.email}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}
