import { getPipelineById } from "@/actions/pipelines";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PipelineManager } from "@/components/pipeline/PipelineManager";
import { StageManager } from "@/components/pipeline/StageManager";

export default async function PipelineDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const pipeline = await getPipelineById(params.id);

  if (!pipeline) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/pipelines"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <PipelineManager pipeline={pipeline} />
        </div>

        {pipeline.isDefault && (
          <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-primary">
            Pipeline Padrão
          </span>
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <StageManager pipelineId={pipeline.id} stages={pipeline.stages} />
      </div>
    </div>
  );
}
