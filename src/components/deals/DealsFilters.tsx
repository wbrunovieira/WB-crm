"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SearchInput } from "@/components/shared/SearchInput";

export function DealsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchInput
        placeholder="Buscar negócios..."
        defaultValue={searchParams.get("search") || ""}
      />

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        <select
          value={searchParams.get("status") || "all"}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Todos os Status</option>
          <option value="open">Abertos</option>
          <option value="won">Ganhos</option>
          <option value="lost">Perdidos</option>
        </select>

        {/* Value Range Filter */}
        <select
          value={searchParams.get("valueRange") || "all"}
          onChange={(e) => handleFilterChange("valueRange", e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Todos os Valores</option>
          <option value="0-10000">Até R$ 10.000</option>
          <option value="10000-50000">R$ 10.000 - R$ 50.000</option>
          <option value="50000-100000">R$ 50.000 - R$ 100.000</option>
          <option value="100000+">Acima de R$ 100.000</option>
        </select>

        {/* Sort By */}
        <select
          value={searchParams.get("sortBy") || "createdAt"}
          onChange={(e) => handleFilterChange("sortBy", e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="createdAt">Mais Recentes</option>
          <option value="value-desc">Maior Valor</option>
          <option value="value-asc">Menor Valor</option>
          <option value="title">Nome (A-Z)</option>
          <option value="expectedCloseDate">Data de Fechamento</option>
        </select>

        {/* Display Mode */}
        <select
          value={searchParams.get("displayMode") || "table"}
          onChange={(e) => handleFilterChange("displayMode", e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="table">Visualização: Tabela</option>
          <option value="cards">Visualização: Cards</option>
        </select>
      </div>
    </div>
  );
}
