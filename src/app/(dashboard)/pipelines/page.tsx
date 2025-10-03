import { getPipelines } from "@/actions/pipelines";
import Link from "next/link";
import { PipelineCreateButton } from "@/components/pipeline/PipelineCreateButton";

export default async function PipelinesPage() {
  const pipelines = await getPipelines();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipelines</h1>
          <p className="mt-2 text-gray-600">
            Gerencie seus pipelines de vendas e estágios
          </p>
        </div>
        <PipelineCreateButton />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pipelines.map((pipeline) => (
          <Link
            key={pipeline.id}
            href={`/pipelines/${pipeline.id}`}
            className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary">
                  {pipeline.name}
                </h3>
                {pipeline.isDefault && (
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-primary">
                    Padrão
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                {pipeline.stages.length} estágios
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {pipeline.stages.slice(0, 4).map((stage) => (
                  <span
                    key={stage.id}
                    className="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                  >
                    {stage.name}
                  </span>
                ))}
                {pipeline.stages.length > 4 && (
                  <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    +{pipeline.stages.length - 4}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-sm font-medium text-primary group-hover:underline">
                Ver detalhes →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {pipelines.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum pipeline encontrado
          </h3>
          <p className="mt-2 text-gray-500">
            Configure seu primeiro pipeline de vendas.
          </p>
        </div>
      )}
    </div>
  );
}
