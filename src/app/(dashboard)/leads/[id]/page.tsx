import { getLeadById } from "@/actions/leads";
import { ConvertLeadButton } from "@/components/leads/ConvertLeadButton";
import { DeleteLeadButton } from "@/components/leads/DeleteLeadButton";
import { LeadContactsList } from "@/components/leads/LeadContactsList";
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

      {/* Lead Contacts */}
      <div className="mt-6">
        <LeadContactsList
          leadId={lead.id}
          leadContacts={lead.leadContacts}
          isConverted={!!lead.convertedAt}
        />
      </div>
    </div>
  );
}
