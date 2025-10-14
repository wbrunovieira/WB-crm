import { getLeadById } from "@/actions/leads";
import { ConvertLeadButton } from "@/components/leads/ConvertLeadButton";
import { DeleteLeadButton } from "@/components/leads/DeleteLeadButton";
import { LeadContactsList } from "@/components/leads/LeadContactsList";
import { LeadActivitiesList } from "@/components/leads/LeadActivitiesList";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await getLeadById(params.id);

  if (!lead) {
    notFound();
  }

  const statusLabels: Record<string, string> = {
    new: "Novo",
    contacted: "Contatado",
    qualified: "Qualificado",
    disqualified: "Desqualificado",
  };

  const qualityLabels: Record<string, string> = {
    cold: "Frio",
    warm: "Morno",
    hot: "Quente",
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lead.businessName}</h1>
          <p className="mt-2 text-gray-600">Detalhes do lead</p>
        </div>
        <div className="flex gap-4">
          {!lead.convertedAt && (
            <>
              <Link
                href={`/leads/${lead.id}/edit`}
                className="rounded-md border border-gray-300 px-4 py-2 text-gray-200 hover:bg-[#2d1b3d]"
              >
                Editar
              </Link>
              <DeleteLeadButton leadId={lead.id} />
              <ConvertLeadButton
                leadId={lead.id}
                hasContacts={lead.leadContacts.length > 0}
              />
            </>
          )}
          {lead.convertedAt && lead.convertedOrganization && (
            <Link
              href={`/organizations/${lead.convertedOrganization.id}`}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Ver Organização
            </Link>
          )}
        </div>
      </div>

      {lead.convertedAt && (
        <div className="mb-6 rounded-lg bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            ✅ Lead convertido em {formatDate(lead.convertedAt)}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informações Básicas */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Nome Comercial
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {lead.businessName}
              </dd>
            </div>
            {lead.registeredName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Razão Social
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lead.registeredName}
                </dd>
              </div>
            )}
            {lead.companyRegistrationID && (
              <div>
                <dt className="text-sm font-medium text-gray-500">CNPJ</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lead.companyRegistrationID}
                </dd>
              </div>
            )}
            {lead.foundationDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Data de Fundação
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(lead.foundationDate)}
                </dd>
              </div>
            )}
            {lead.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Descrição
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lead.description}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                    lead.status === "qualified"
                      ? "bg-green-100 text-green-800"
                      : lead.status === "contacted"
                        ? "bg-blue-100 text-blue-800"
                        : lead.status === "disqualified"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {statusLabels[lead.status]}
                </span>
              </dd>
            </div>
            {lead.quality && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Qualidade
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                      lead.quality === "hot"
                        ? "bg-red-100 text-red-800"
                        : lead.quality === "warm"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {qualityLabels[lead.quality]}
                  </span>
                </dd>
              </div>
            )}
            {lead.label && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Label</dt>
                <dd className="mt-1">
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${lead.label.color}20`,
                      color: lead.label.color,
                      border: `1px solid ${lead.label.color}`,
                    }}
                  >
                    {lead.label.name}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Contato */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Contato da Empresa</h2>
          <dl className="space-y-4">
            {lead.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.phone}</dd>
              </div>
            )}
            {lead.whatsapp && (
              <div>
                <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.whatsapp}</dd>
              </div>
            )}
            {lead.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.email}</dd>
              </div>
            )}
            {lead.website && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-primary">
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {lead.website}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Localização */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Localização</h2>
          <dl className="space-y-4">
            {lead.address && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.address}</dd>
              </div>
            )}
            {lead.vicinity && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Bairro/Região</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.vicinity}</dd>
              </div>
            )}
            {lead.city && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cidade</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.city}</dd>
              </div>
            )}
            {lead.state && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.state}</dd>
              </div>
            )}
            {lead.country && (
              <div>
                <dt className="text-sm font-medium text-gray-500">País</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.country}</dd>
              </div>
            )}
            {lead.zipCode && (
              <div>
                <dt className="text-sm font-medium text-gray-500">CEP</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.zipCode}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Redes Sociais */}
      {(lead.instagram || lead.linkedin || lead.facebook || lead.twitter || lead.tiktok) && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Redes Sociais</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lead.instagram && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Instagram</dt>
                <dd className="mt-1 text-sm text-primary">
                  <a
                    href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {lead.instagram}
                  </a>
                </dd>
              </div>
            )}
            {lead.linkedin && (
              <div>
                <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                <dd className="mt-1 text-sm text-primary">
                  <a
                    href={lead.linkedin.startsWith('http') ? lead.linkedin : `https://linkedin.com/company/${lead.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {lead.linkedin}
                  </a>
                </dd>
              </div>
            )}
            {lead.facebook && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Facebook</dt>
                <dd className="mt-1 text-sm text-primary">
                  <a
                    href={lead.facebook.startsWith('http') ? lead.facebook : `https://facebook.com/${lead.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {lead.facebook}
                  </a>
                </dd>
              </div>
            )}
            {lead.twitter && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Twitter/X</dt>
                <dd className="mt-1 text-sm text-primary">
                  <a
                    href={lead.twitter.startsWith('http') ? lead.twitter : `https://twitter.com/${lead.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {lead.twitter}
                  </a>
                </dd>
              </div>
            )}
            {lead.tiktok && (
              <div>
                <dt className="text-sm font-medium text-gray-500">TikTok</dt>
                <dd className="mt-1 text-sm text-primary">
                  <a
                    href={lead.tiktok.startsWith('http') ? lead.tiktok : `https://tiktok.com/@${lead.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {lead.tiktok}
                  </a>
                </dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informações da Empresa */}
      {(lead.companyOwner || lead.companySize || lead.revenue || lead.employeesCount || lead.primaryActivity || lead.secondaryActivities || lead.businessStatus || lead.equityCapital) && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações da Empresa</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lead.companyOwner && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Proprietário/CEO</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.companyOwner}</dd>
              </div>
            )}
            {lead.companySize && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tamanho</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.companySize}</dd>
              </div>
            )}
            {lead.employeesCount && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Funcionários</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.employeesCount}</dd>
              </div>
            )}
            {lead.revenue && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Receita Anual</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.revenue)}
                </dd>
              </div>
            )}
            {lead.equityCapital && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Capital Social</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.equityCapital)}
                </dd>
              </div>
            )}
            {lead.businessStatus && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Status do Negócio</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.businessStatus}</dd>
              </div>
            )}
            {lead.primaryActivity && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Atividade Primária</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.primaryActivity}</dd>
              </div>
            )}
            {lead.secondaryActivities && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Atividades Secundárias</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.secondaryActivities}</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Places */}
      {(lead.googleId || lead.categories || lead.rating || lead.userRatingsTotal || lead.priceLevel || lead.types) && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações do Google Places</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {lead.rating && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Avaliação</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  {lead.rating.toFixed(1)} / 5.0
                </dd>
              </div>
            )}
            {lead.userRatingsTotal && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Total de Avaliações</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.userRatingsTotal} avaliações</dd>
              </div>
            )}
            {lead.priceLevel && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Nível de Preço</dt>
                <dd className="mt-1 text-sm text-gray-900">{'$'.repeat(lead.priceLevel)}</dd>
              </div>
            )}
            {lead.categories && (
              <div className="md:col-span-2 lg:col-span-4">
                <dt className="text-sm font-medium text-gray-500">Categorias</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.categories}</dd>
              </div>
            )}
            {lead.types && (
              <div className="md:col-span-2 lg:col-span-4">
                <dt className="text-sm font-medium text-gray-500">Tipos</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.types}</dd>
              </div>
            )}
            {lead.googleId && (
              <div className="md:col-span-2 lg:col-span-4">
                <dt className="text-sm font-medium text-gray-500">Google Places ID</dt>
                <dd className="mt-1 text-xs text-gray-600 font-mono">{lead.googleId}</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadados */}
      {(lead.source || lead.searchTerm || lead.category || lead.radius) && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Metadados de Busca</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {lead.source && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Fonte</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.source}</dd>
              </div>
            )}
            {lead.searchTerm && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Termo de Busca</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.searchTerm}</dd>
              </div>
            )}
            {lead.category && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Categoria</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.category}</dd>
              </div>
            )}
            {lead.radius && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Raio de Busca</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.radius} km</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Contacts */}
      <div className="mt-6">
        <LeadContactsList
          leadId={lead.id}
          leadContacts={lead.leadContacts}
          isConverted={!!lead.convertedAt}
        />
      </div>

      {/* Lead Activities */}
      <div className="mt-6">
        <LeadActivitiesList leadId={lead.id} activities={lead.activities} />
      </div>
    </div>
  );
}
