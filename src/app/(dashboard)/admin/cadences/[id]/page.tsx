import Link from "next/link";
import { notFound } from "next/navigation";
import { Target, Users, Calendar, Zap } from "lucide-react";
import { backendFetch } from "@/lib/backend/client";
import { CadenceStepForm } from "@/components/admin/CadenceStepForm";
import { CadenceStepsList } from "@/components/admin/CadenceStepsList";
import { CadenceHeader } from "@/components/admin/CadenceHeader";

interface CadenceDetailPageProps {
  params: Promise<{ id: string }>;
}

interface Cadence {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  objective?: string | null;
  durationDays: number;
  icpId?: string | null;
  status: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface CadenceStep {
  id: string;
  dayNumber: number;
}

export default async function CadenceDetailPage({ params }: CadenceDetailPageProps) {
  const { id } = await params;

  const [cadence, steps, leadCountData, icps] = await Promise.all([
    backendFetch<Cadence>(`/cadences/${id}`).catch(() => null),
    backendFetch<CadenceStep[]>(`/cadences/${id}/steps`).catch(() => []),
    backendFetch<{ count: number }>(`/cadences/${id}/lead-count`).catch(() => ({ count: 0 })),
    backendFetch<{ id: string; name: string }[]>('/icps').catch(() => []),
  ]);

  if (!cadence) {
    notFound();
  }

  const maxDay = steps.length > 0 ? Math.max(...steps.map((s) => s.dayNumber)) : 1;
  const icpOptions = icps.map((icp) => ({ id: icp.id, name: icp.name }));
  const activeLeadCadencesCount = leadCountData.count;

  return (
    <div className="p-8">
      <CadenceHeader
        cadence={{
          id: cadence.id,
          name: cadence.name,
          slug: cadence.slug,
          description: cadence.description ?? null,
          objective: cadence.objective ?? null,
          durationDays: cadence.durationDays,
          icpId: cadence.icpId ?? null,
          status: cadence.status,
          icp: null,
          activeLeadCadencesCount,
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

              <div>
                <h3 className="text-sm font-medium text-gray-500">Leads Ativos</h3>
                <p className="mt-1 flex items-center gap-2 text-gray-900">
                  <Users className="h-4 w-4 text-primary" />
                  {activeLeadCadencesCount} leads
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
          <CadenceStepsList cadenceId={id} />
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
                <dd className="font-medium text-gray-900">{steps.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4" />
                  Dias com Atividade
                </dt>
                <dd className="font-medium text-gray-900">
                  {new Set(steps.map((s) => s.dayNumber)).size}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Users className="h-4 w-4" />
                  Leads Ativos
                </dt>
                <dd className="font-medium text-gray-900">{activeLeadCadencesCount}</dd>
              </div>
            </dl>
          </div>

          {/* Info Card */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informações</h2>
            <dl className="space-y-3 text-sm">
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
