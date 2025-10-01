import { getPipelineView } from "@/actions/pipeline-view";
import { getPipelines } from "@/actions/pipelines";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import Link from "next/link";

export default async function PipelineViewPage({
  searchParams,
}: {
  searchParams: { pipelineId?: string };
}) {
  const [pipelineData, allPipelines] = await Promise.all([
    getPipelineView(searchParams.pipelineId),
    getPipelines(),
  ]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              defaultValue={pipelineData.id}
              onChange={(e) => {
                window.location.href = `/pipeline?pipelineId=${e.target.value}`;
              }}
            >
              {allPipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isDefault && "(Padrão)"}
                </option>
              ))}
            </select>
          </div>
          <Link
            href="/deals/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Novo Negócio
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <PipelineBoard pipeline={pipelineData} />
      </div>
    </div>
  );
}
