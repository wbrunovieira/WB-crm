import { getPartnerById } from "@/actions/partners";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const partner = await getPartnerById(params.id);

  if (!partner) {
    notFound();
  }

  const daysSinceLastContact = partner.lastContactDate
    ? Math.ceil(
        (new Date().getTime() - new Date(partner.lastContactDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{partner.name}</h1>
          <p className="mt-2 text-gray-600">{partner.partnerType}</p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/partners/${partner.id}/edit`}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Last Contact Alert */}
      {daysSinceLastContact !== null && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            daysSinceLastContact > 60
              ? "bg-red-50 border border-red-200"
              : daysSinceLastContact > 30
                ? "bg-orange-50 border border-orange-200"
                : "bg-green-50 border border-green-200"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              daysSinceLastContact > 60
                ? "text-red-800"
                : daysSinceLastContact > 30
                  ? "text-orange-800"
                  : "text-green-800"
            }`}
          >
            {daysSinceLastContact === 0
              ? "Último contato: hoje"
              : daysSinceLastContact === 1
                ? "Último contato: há 1 dia"
                : `Último contato: há ${daysSinceLastContact} dias`}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nome da Empresa</dt>
              <dd className="mt-1 text-sm text-gray-900">{partner.name}</dd>
            </div>
            {partner.legalName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Razão Social</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.legalName}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Tipo de Parceria
              </dt>
              <dd className="mt-1">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  {partner.partnerType}
                </span>
              </dd>
            </div>
            {partner.industry && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Setor</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.industry}</dd>
              </div>
            )}
            {partner.expertise && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Expertise</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {partner.expertise}
                </dd>
              </div>
            )}
            {partner.employeeCount && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Funcionários</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.employeeCount}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Cadastrado em
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(partner.createdAt)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Contato da Empresa</h2>
          <dl className="space-y-4">
            {partner.website && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {partner.website}
                  </a>
                </dd>
              </div>
            )}
            {partner.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`mailto:${partner.email}`}
                    className="text-primary hover:underline"
                  >
                    {partner.email}
                  </a>
                </dd>
              </div>
            )}
            {partner.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.phone}</dd>
              </div>
            )}
            {partner.whatsapp && (
              <div>
                <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`https://wa.me/${partner.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {partner.whatsapp}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Location */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Localização</h2>
          <dl className="space-y-4">
            {partner.streetAddress && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.streetAddress}</dd>
              </div>
            )}
            {partner.city && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cidade</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.city}</dd>
              </div>
            )}
            {partner.state && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.state}</dd>
              </div>
            )}
            {partner.zipCode && (
              <div>
                <dt className="text-sm font-medium text-gray-500">CEP</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.zipCode}</dd>
              </div>
            )}
            {partner.country && (
              <div>
                <dt className="text-sm font-medium text-gray-500">País</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.country}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Social Media */}
      {(partner.linkedin || partner.instagram || partner.facebook || partner.twitter) && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Redes Sociais</h2>
          <dl className="grid gap-4 md:grid-cols-2">
            {partner.linkedin && (
              <div>
                <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={partner.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {partner.linkedin}
                  </a>
                </dd>
              </div>
            )}
            {partner.instagram && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Instagram</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.instagram}</dd>
              </div>
            )}
            {partner.facebook && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Facebook</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.facebook}</dd>
              </div>
            )}
            {partner.twitter && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Twitter/X</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.twitter}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Description */}
      {partner.description && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Descrição</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {partner.description}
          </p>
        </div>
      )}

      {/* Contacts and Activities */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Contacts */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Contatos ({partner.contacts.length})
            </h2>
            <Link
              href={`/contacts/new?partnerId=${partner.id}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              + Novo Contato
            </Link>
          </div>
          {partner.contacts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum contato cadastrado</p>
          ) : (
            <ul className="space-y-2">
              {partner.contacts.map((contact) => (
                <li key={contact.id} className="text-sm">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {contact.name}
                  </Link>
                  {contact.role && (
                    <span className="ml-2 text-gray-500">• {contact.role}</span>
                  )}
                  {contact.email && (
                    <span className="block text-xs text-gray-400">{contact.email}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Activities */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Atividades ({partner.activities.length})
            </h2>
            <Link
              href={`/activities/new?partnerId=${partner.id}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              + Nova Atividade
            </Link>
          </div>
          {partner.activities.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma atividade registrada</p>
          ) : (
            <ul className="space-y-3">
              {partner.activities.slice(0, 5).map((activity) => (
                <li key={activity.id} className="border-b border-gray-100 pb-2">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.subject}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Referred Leads */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Leads Indicados ({partner.referredLeads.length})
            </h2>
          </div>
          {partner.referredLeads.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum lead indicado ainda</p>
          ) : (
            <ul className="space-y-3">
              {partner.referredLeads.map((lead) => (
                <li key={lead.id} className="border-b border-gray-100 pb-2">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {lead.businessName}
                  </Link>
                  {lead.convertedOrganization && (
                    <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Convertido
                    </span>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatDate(lead.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Statistics and Notes */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Estatísticas</h2>
          <dl className="grid gap-4 grid-cols-3">
            <div className="text-center">
              <dt className="text-xs font-medium text-gray-500">Contatos</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {partner._count.contacts}
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs font-medium text-gray-500">Atividades</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {partner._count.activities}
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs font-medium text-gray-500">Leads Indicados</dt>
              <dd className="mt-1 text-2xl font-bold text-green-600">
                {partner._count.referredLeads}
              </dd>
            </div>
          </dl>
        </div>

        {partner.notes && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Observações Internas</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {partner.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
