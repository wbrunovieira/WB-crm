import { getPipelineById } from "@/actions/pipelines";
import { notFound } from "next/navigation";
import Link from "next/link";

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
        <div className="flex items-center gap-2">
          <Link
            href="/pipelines"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </Link>
        </div>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{pipeline.name}</h1>
            {pipeline.isDefault && (
              <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-primary">
                Pipeline Padrão
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-6 text-lg font-semibold">
          Estágios ({pipeline.stages.length})
        </h2>

        <div className="space-y-3">
          {pipeline.stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-gray-300"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{stage.name}</h3>
                  <p className="text-sm text-gray-500">
                    Probabilidade: {stage.probability}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {stage._count.deals}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stage._count.deals === 1 ? "negócio" : "negócios"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pipeline.stages.length === 0 && (
          <p className="text-center text-gray-500">
            Nenhum estágio configurado
          </p>
        )}
      </div>
    </div>
  );
}
