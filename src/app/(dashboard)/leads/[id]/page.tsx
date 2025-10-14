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
    <div className="min-h-screen bg-gradient-to-br from-[#792990] via-[#8b3fa3] to-[#6a1b7a] p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{lead.businessName}</h1>
              {lead.quality && (
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold tracking-wide uppercase ${
                    lead.quality === "hot"
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md"
                      : lead.quality === "warm"
                        ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md"
                        : "bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-md"
                  }`}
                >
                  {qualityLabels[lead.quality]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  lead.status === "qualified"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : lead.status === "contacted"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : lead.status === "disqualified"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}
              >
                {statusLabels[lead.status]}
              </span>
              {lead.label && (
                <span
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold"
                  style={{
                    backgroundColor: `${lead.label.color}15`,
                    color: lead.label.color,
                    border: `1.5px solid ${lead.label.color}40`,
                  }}
                >
                  {lead.label.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {!lead.convertedAt && (
              <>
                <Link
                  href={`/leads/${lead.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#792990] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <span className="text-lg">✏️</span>
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
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                🏢 Ver Organização
              </Link>
            )}
          </div>
        </div>
      </div>

      {lead.convertedAt && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-5 shadow-sm">
          <p className="text-base font-semibold text-green-900 flex items-center gap-2">
            <span className="text-2xl">✅</span>
            Lead convertido em {formatDate(lead.convertedAt)}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informações Básicas */}
        <div className="rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-100">
            <span className="text-2xl">📋</span>
            Informações Básicas
          </h2>
          <dl className="space-y-5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Nome Comercial
              </dt>
              <dd className="text-base font-medium text-gray-900">
                {lead.businessName}
              </dd>
            </div>
            {lead.registeredName && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Razão Social
                </dt>
                <dd className="text-base font-medium text-gray-900">
                  {lead.registeredName}
                </dd>
              </div>
            )}
            {lead.companyRegistrationID && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">CNPJ</dt>
                <dd className="text-base font-mono text-gray-900">
                  {lead.companyRegistrationID}
                </dd>
              </div>
            )}
            {lead.foundationDate && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Data de Fundação
                </dt>
                <dd className="text-base font-medium text-gray-900">
                  {formatDate(lead.foundationDate)}
                </dd>
              </div>
            )}
            {lead.description && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Descrição
                </dt>
                <dd className="text-sm leading-relaxed text-gray-700">
                  {lead.description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Contato */}
        <div className="rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-100">
            <span className="text-2xl">📞</span>
            Contato da Empresa
          </h2>
          <dl className="space-y-5">
            {lead.phone && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Telefone</dt>
                <dd className="text-base font-mono text-gray-900">{lead.phone}</dd>
              </div>
            )}
            {lead.whatsapp && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">WhatsApp</dt>
                <dd className="text-base font-mono text-gray-900 flex items-center gap-2">
                  <span>💬</span>
                  {lead.whatsapp}
                </dd>
              </div>
            )}
            {lead.email && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Email</dt>
                <dd className="text-base text-gray-700 hover:text-purple-600 hover:underline font-medium">
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </dd>
              </div>
            )}
            {lead.website && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Website</dt>
                <dd className="text-base text-gray-700 hover:text-purple-600 hover:underline font-medium">
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    🌐 {lead.website}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Localização */}
        <div className="rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-100">
            <span className="text-2xl">📍</span>
            Localização
          </h2>
          <dl className="space-y-5">
            {lead.address && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Endereço</dt>
                <dd className="text-base font-medium text-gray-900">{lead.address}</dd>
              </div>
            )}
            {lead.vicinity && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Bairro/Região</dt>
                <dd className="text-base font-medium text-gray-900">{lead.vicinity}</dd>
              </div>
            )}
            {lead.city && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Cidade</dt>
                <dd className="text-base font-medium text-gray-900">{lead.city}</dd>
              </div>
            )}
            {lead.state && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Estado</dt>
                <dd className="text-base font-medium text-gray-900">{lead.state}</dd>
              </div>
            )}
            {lead.country && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">País</dt>
                <dd className="text-base font-medium text-gray-900">{lead.country}</dd>
              </div>
            )}
            {lead.zipCode && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">CEP</dt>
                <dd className="text-base font-mono text-gray-900">{lead.zipCode}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Redes Sociais */}
      {(lead.instagram || lead.linkedin || lead.facebook || lead.twitter || lead.tiktok) && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-100">
            <span className="text-2xl">🌐</span>
            Redes Sociais
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {lead.instagram && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Instagram</dt>
                <dd className="text-base">
                  <a
                    href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-purple-600 hover:underline font-medium"
                  >
                    📸 {lead.instagram}
                  </a>
                </dd>
              </div>
            )}
            {lead.linkedin && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">LinkedIn</dt>
                <dd className="text-base">
                  <a
                    href={lead.linkedin.startsWith('http') ? lead.linkedin : `https://linkedin.com/company/${lead.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-purple-600 hover:underline font-medium"
                  >
                    💼 {lead.linkedin}
                  </a>
                </dd>
              </div>
            )}
            {lead.facebook && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Facebook</dt>
                <dd className="text-base">
                  <a
                    href={lead.facebook.startsWith('http') ? lead.facebook : `https://facebook.com/${lead.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-purple-600 hover:underline font-medium"
                  >
                    👥 {lead.facebook}
                  </a>
                </dd>
              </div>
            )}
            {lead.twitter && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Twitter/X</dt>
                <dd className="text-base">
                  <a
                    href={lead.twitter.startsWith('http') ? lead.twitter : `https://twitter.com/${lead.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-purple-600 hover:underline font-medium"
                  >
                    🐦 {lead.twitter}
                  </a>
                </dd>
              </div>
            )}
            {lead.tiktok && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">TikTok</dt>
                <dd className="text-base">
                  <a
                    href={lead.tiktok.startsWith('http') ? lead.tiktok : `https://tiktok.com/@${lead.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-700 hover:text-purple-600 hover:underline font-medium"
                  >
                    🎵 {lead.tiktok}
                  </a>
                </dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informações da Empresa */}
      {(lead.companyOwner || lead.companySize || lead.revenue || lead.employeesCount || lead.primaryActivity || lead.secondaryActivities || lead.businessStatus || lead.equityCapital) && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 pb-3 border-b-2 border-gray-100">
            <span className="text-2xl">🏢</span>
            Informações da Empresa
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lead.companyOwner && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Proprietário/CEO</dt>
                <dd className="text-base font-medium text-gray-900">{lead.companyOwner}</dd>
              </div>
            )}
            {lead.companySize && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Tamanho</dt>
                <dd className="text-base font-medium text-gray-900">{lead.companySize}</dd>
              </div>
            )}
            {lead.employeesCount && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Funcionários</dt>
                <dd className="text-base font-semibold text-gray-900">👥 {lead.employeesCount}</dd>
              </div>
            )}
            {lead.revenue && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Receita Anual</dt>
                <dd className="text-base font-semibold text-gray-900">
                  💰 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.revenue)}
                </dd>
              </div>
            )}
            {lead.equityCapital && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Capital Social</dt>
                <dd className="text-base font-semibold text-gray-900">
                  💰 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.equityCapital)}
                </dd>
              </div>
            )}
            {lead.businessStatus && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Status do Negócio</dt>
                <dd className="text-base font-medium text-gray-900">{lead.businessStatus}</dd>
              </div>
            )}
            {lead.primaryActivity && (
              <div className="md:col-span-2 lg:col-span-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Atividade Primária</dt>
                <dd className="text-base font-medium text-gray-900">{lead.primaryActivity}</dd>
              </div>
            )}
            {lead.secondaryActivities && (
              <div className="md:col-span-2 lg:col-span-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Atividades Secundárias</dt>
                <dd className="text-sm leading-relaxed text-gray-700">{lead.secondaryActivities}</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Places */}
      {(lead.googleId || lead.categories || lead.rating || lead.userRatingsTotal || lead.priceLevel || lead.types) && (
        <div className="mt-6 rounded-xl bg-gradient-to-br from-white to-blue-50 p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 pb-3 border-b-2 border-blue-100">
            <span className="text-2xl">🗺️</span>
            Informações do Google Places
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {lead.rating && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Avaliação</dt>
                <dd className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-3xl">⭐</span>
                  {lead.rating.toFixed(1)}
                  <span className="text-sm font-normal text-gray-500">/ 5.0</span>
                </dd>
              </div>
            )}
            {lead.userRatingsTotal && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Total de Avaliações</dt>
                <dd className="text-2xl font-bold text-blue-600">{lead.userRatingsTotal}</dd>
              </div>
            )}
            {lead.priceLevel && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Nível de Preço</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {'💰'.repeat(lead.priceLevel)}
                </dd>
              </div>
            )}
            {lead.categories && (
              <div className="md:col-span-2 lg:col-span-4 bg-white rounded-lg p-4 shadow-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Categorias</dt>
                <dd className="text-base font-medium text-gray-900">{lead.categories}</dd>
              </div>
            )}
            {lead.types && (
              <div className="md:col-span-2 lg:col-span-4 bg-white rounded-lg p-4 shadow-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Tipos</dt>
                <dd className="text-sm text-gray-700">{lead.types}</dd>
              </div>
            )}
            {lead.googleId && (
              <div className="md:col-span-2 lg:col-span-4 bg-white rounded-lg p-4 shadow-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Google Places ID</dt>
                <dd className="text-xs text-gray-600 font-mono break-all">{lead.googleId}</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadados */}
      {(lead.source || lead.searchTerm || lead.category || lead.radius) && (
        <div className="mt-6 rounded-xl bg-gradient-to-br from-gray-50 to-purple-50 p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900 pb-3 border-b-2 border-purple-100">
            <span className="text-2xl">🔍</span>
            Metadados de Busca
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {lead.source && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Fonte</dt>
                <dd className="text-base font-medium text-gray-900">{lead.source}</dd>
              </div>
            )}
            {lead.searchTerm && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Termo de Busca</dt>
                <dd className="text-base font-medium text-purple-900">"{lead.searchTerm}"</dd>
              </div>
            )}
            {lead.category && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Categoria</dt>
                <dd className="text-base font-medium text-gray-900">{lead.category}</dd>
              </div>
            )}
            {lead.radius && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Raio de Busca</dt>
                <dd className="text-base font-semibold text-purple-900">📏 {lead.radius} km</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Contacts */}
      <div className="mt-8">
        <LeadContactsList
          leadId={lead.id}
          leadContacts={lead.leadContacts}
          isConverted={!!lead.convertedAt}
        />
      </div>

      {/* Lead Activities */}
      <div className="mt-6 mb-8">
        <LeadActivitiesList leadId={lead.id} activities={lead.activities} />
      </div>
    </div>
  );
}
