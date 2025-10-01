"use client";

import { useRouter } from "next/navigation";

type Pipeline = {
  id: string;
  name: string;
  isDefault: boolean;
};

type PipelineSelectorProps = {
  pipelines: Pipeline[];
  currentPipelineId: string;
};

export default function PipelineSelector({
  pipelines,
  currentPipelineId,
}: PipelineSelectorProps) {
  const router = useRouter();

  return (
    <select
      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      defaultValue={currentPipelineId}
      onChange={(e) => {
        router.push(`/pipeline?pipelineId=${e.target.value}`);
      }}
    >
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} {p.isDefault && "(Padrão)"}
        </option>
      ))}
    </select>
  );
}
