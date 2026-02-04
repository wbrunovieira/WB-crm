import Link from "next/link";
import { notFound } from "next/navigation";
import { Target, Users, Calendar, Zap } from "lucide-react";
import { getCadenceById } from "@/actions/cadences";
import { getICPs } from "@/actions/icps";
import { CadenceStepForm } from "@/components/admin/CadenceStepForm";
import { CadenceStepsList } from "@/components/admin/CadenceStepsList";
import { CadenceHeader } from "@/components/admin/CadenceHeader";

interface CadenceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CadenceDetailPage({ params }: CadenceDetailPageProps) {
  const { id } = await params;

  const [cadence, icps] = await Promise.all([
    getCadenceById(id),
    getICPs(),
  ]);

  if (!cadence) {
    notFound();
  }

  // Calculate max day for step form suggestion
  const maxDay = cadence.steps.length > 0
    ? Math.max(...cadence.steps.map((s) => s.dayNumber))
    : 1;

  // Format ICPs for the modal
  const icpOptions = icps.map((icp) => ({
    id: icp.id,
    name: icp.name,
  }));

  return (
    <div className="p-8">
      <CadenceHeader
        cadence={{
          id: cadence.id,
          name: cadence.name,
          slug: cadence.slug,
          description: cadence.description,
          objective: cadence.objective,
          durationDays: cadence.durationDays,
          icpId: cadence.icpId,
          status: cadence.status,
          icp: cadence.icp,
        }}
        icps={icpOptions}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Content Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cadence Info */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Informações da Cadência
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Objetivo</h3>
                <p className="mt-1 text-gray-900">
                  {cadence.objective || "Não definido"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Duração</h3>
                <p className="mt-1 flex items-center gap-2 text-gray-900">
                  <Calendar className="h-4 w-4 text-primary" />
                  {cadence.durationDays} dias
                </p>
              </div>

              {cadence.icp && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">ICP Vinculado</h3>
                  <p className="mt-1 flex items-center gap-2 text-gray-900">
                    <Target className="h-4 w-4 text-primary" />
                    <Link
                      href={`/admin/icps/${cadence.icp.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {cadence.icp.name}
                    </Link>
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500">Leads Ativos</h3>
                <p className="mt-1 flex items-center gap-2 text-gray-900">
                  <Users className="h-4 w-4 text-primary" />
                  {cadence._count.leadCadences} leads
                </p>
              </div>
            </div>

            {cadence.description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Descrição</h3>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">
                  {cadence.description}
                </p>
              </div>
            )}
          </div>

          {/* Steps Timeline */}
          <CadenceStepsList steps={cadence.steps} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Add Step Form */}
          <CadenceStepForm cadenceId={id} maxDay={maxDay} />

          {/* Stats Card */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Estatísticas</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Zap className="h-4 w-4" />
                  Total de Etapas
                </dt>
                <dd className="font-medium text-gray-900">
                  {cadence.steps.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4" />
                  Dias com Atividade
                </dt>
                <dd className="font-medium text-gray-900">
                  {new Set(cadence.steps.map((s) => s.dayNumber)).size}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Users className="h-4 w-4" />
                  Leads Ativos
                </dt>
                <dd className="font-medium text-gray-900">
                  {cadence._count.leadCadences}
                </dd>
              </div>
            </dl>
          </div>

          {/* Info Card */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informações</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Criado por</dt>
                <dd className="font-medium text-gray-900">
                  {cadence.owner.name || cadence.owner.email}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Criado em</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(cadence.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Última atualização</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(cadence.updatedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
