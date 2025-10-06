"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PipelineBoard from "../pipeline/PipelineBoard";

type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  organization: {
    id: string;
    name: string;
  } | null;
};

type Stage = {
  id: string;
  name: string;
  order: number;
  probability: number;
  deals: Deal[];
};

type Pipeline = {
  id: string;
  name: string;
  stages: Stage[];
};

interface DealsKanbanViewProps {
  pipelineData: Pipeline;
  allPipelines: { id: string; name: string; isDefault: boolean }[];
}

export function DealsKanbanView({ pipelineData, allPipelines }: DealsKanbanViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePipelineChange = (pipelineId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pipelineId", pipelineId);
    router.push(`/deals?${params.toString()}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Pipeline Selector */}
      <div className="mb-6">
        <label htmlFor="pipeline-select" className="block text-sm font-medium text-gray-700 mb-2">
          Pipeline
        </label>
        <select
          id="pipeline-select"
          value={pipelineData.id}
          onChange={(e) => handlePipelineChange(e.target.value)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {allPipelines.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
              {pipeline.isDefault ? " (Padrão)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <PipelineBoard pipeline={pipelineData} />
      </div>
    </div>
  );
}
