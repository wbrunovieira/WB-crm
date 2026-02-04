import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit, Users, Building2, Clock } from "lucide-react";
import { getICPById, getICPVersions } from "@/actions/icps";
import { getICPLeads, getICPOrganizations } from "@/actions/icp-links";
import { ICPVersionHistory } from "@/components/admin/ICPVersionHistory";

interface ICPDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  active: { label: "Ativo", color: "bg-green-100 text-green-700" },
  archived: { label: "Arquivado", color: "bg-yellow-100 text-yellow-700" },
};

export default async function ICPDetailPage({ params }: ICPDetailPageProps) {
  const { id } = await params;

  const [icp, versions, leads, organizations] = await Promise.all([
    getICPById(id),
    getICPVersions(id),
    getICPLeads(id),
    getICPOrganizations(id),
  ]);

  if (!icp) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/icps"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para ICPs
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{icp.name}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusLabels[icp.status]?.color || "bg-gray-100 text-gray-700"
              }`}
            >
              {statusLabels[icp.status]?.label || icp.status}
            </span>
          </div>
          <Link
            href={`/admin/icps/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">/{icp.slug}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Content Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Descrição do ICP
            </h2>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-700">
                {icp.content}
              </pre>
            </div>
          </div>

          {/* Linked Leads */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Users className="h-5 w-5 text-primary" />
              Leads Vinculados ({leads.length})
            </h2>
            {leads.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum lead vinculado a este ICP.</p>
            ) : (
              <div className="space-y-2">
                {leads.map((link) => (
                  <Link
                    key={link.id}
                    href={`/leads/${link.lead.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {link.lead.businessName}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {link.lead.city}, {link.lead.state}
                      </span>
                    </div>
                    {link.matchScore && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {link.matchScore}% match
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Linked Organizations */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Building2 className="h-5 w-5 text-primary" />
              Organizações Vinculadas ({organizations.length})
            </h2>
            {organizations.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma organização vinculada a este ICP.</p>
            ) : (
              <div className="space-y-2">
                {organizations.map((link) => (
                  <Link
                    key={link.id}
                    href={`/organizations/${link.organization.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {link.organization.name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {link.organization.city}, {link.organization.state}
                      </span>
                    </div>
                    {link.matchScore && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {link.matchScore}% match
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informações</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Criado por</dt>
                <dd className="font-medium text-gray-900">
                  {icp.owner.name || icp.owner.email}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Criado em</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(icp.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Última atualização</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(icp.updatedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Versão atual</dt>
                <dd className="font-medium text-gray-900">v{versions.length}</dd>
              </div>
            </dl>
          </div>

          {/* Version History */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Versões
            </h2>
            <ICPVersionHistory icpId={id} versions={versions} />
          </div>
        </div>
      </div>
    </div>
  );
}
