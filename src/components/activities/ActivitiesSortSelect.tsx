"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ActivitiesSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sortBy") || "default";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "default") {
      params.delete("sortBy");
    } else {
      params.set("sortBy", value);
    }

    router.push(`/activities?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
        Ordenar por:
      </label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="default">Padrão</option>
        <option value="dueDate-asc">Data (Mais antiga)</option>
        <option value="dueDate-desc">Data (Mais recente)</option>
        <option value="created-desc">Criação (Mais recente)</option>
        <option value="created-asc">Criação (Mais antiga)</option>
        <option value="subject">Assunto (A-Z)</option>
      </select>
    </div>
  );
}
