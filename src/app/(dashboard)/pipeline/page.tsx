import { backendFetch } from "@/lib/backend/client";
import type { PipelineSummary } from "@/hooks/pipelines/use-pipelines";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import PipelineSelector from "@/components/pipeline/PipelineSelector";
import Link from "next/link";

interface PipelineViewDeal {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  contactName: string | null;
  organizationName: string | null;
}

interface PipelineView {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Array<{
    id: string;
    name: string;
    order: number;
    probability: number;
    deals: PipelineViewDeal[];
  }>;
}

function transformPipelineView(pipelineData: PipelineView) {
  return {
    id: pipelineData.id,
    name: pipelineData.name,
    stages: pipelineData.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      probability: stage.probability,
      deals: stage.deals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        value: deal.value ?? 0,
        currency: deal.currency,
        contact: deal.contactName ? { id: deal.id, name: deal.contactName, email: null } : null,
        organization: deal.organizationName ? { id: deal.id, name: deal.organizationName } : null,
      })),
    })),
  };
}

export default async function PipelineViewPage({
  searchParams,
}: {
  searchParams: { pipelineId?: string };
}) {
  const qs = searchParams.pipelineId ? `?pipelineId=${searchParams.pipelineId}` : "";
  const [pipelineData, allPipelines] = await Promise.all([
    backendFetch<PipelineView>(`/pipelines/view${qs}`).catch(() => null),
    backendFetch<PipelineSummary[]>('/pipelines').catch(() => [] as PipelineSummary[]),
  ]);

  if (!pipelineData) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-gray-500">Nenhum pipeline encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
            <PipelineSelector
              pipelines={allPipelines}
              currentPipelineId={pipelineData.id}
            />
          </div>
          <Link
            href="/deals/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Novo Negócio
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden" style={{ background: "#792990" }}>
        <PipelineBoard pipeline={transformPipelineView(pipelineData)} />
      </div>
    </div>
  );
}
