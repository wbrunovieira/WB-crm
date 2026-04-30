"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { Search, UserSearch } from "lucide-react";

interface ICP {
  id: string;
  name: string;
}

interface LeadsFiltersProps {
  icps?: ICP[];
  sourceGroups?: string[];
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
      {children}
    </span>
  );
}

export function LeadsFilters({ icps = [], sourceGroups = [] }: LeadsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) params.set("search", term);
    else params.delete("search");
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleContactSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) params.set("contactSearch", term);
    else params.delete("contactSearch");
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const selectClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white";

  return (
    <div className="mb-6 space-y-3">
      {/* Row 1 — Busca */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <FilterLabel>Empresa</FilterLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome da empresa..."
              defaultValue={searchParams.get("search")?.toString()}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="relative w-72">
          <FilterLabel>Contato</FilterLabel>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <UserSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              defaultValue={searchParams.get("contactSearch")?.toString()}
              onChange={(e) => handleContactSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Row 2 — Filtros */}
      <div className="flex flex-wrap gap-3">
        {/* Status */}
        <div className="min-w-[140px]">
          <FilterLabel>Status</FilterLabel>
          <select
            value={searchParams.get("status")?.toString() || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className={selectClass}
          >
            <option value="">Todos</option>
            <option value="new">Novo</option>
            <option value="contacted">Contatado</option>
            <option value="qualified">Qualificado</option>
            <option value="disqualified">Desqualificado</option>
          </select>
        </div>

        {/* Qualidade */}
        <div className="min-w-[130px]">
          <FilterLabel>Qualidade</FilterLabel>
          <select
            value={searchParams.get("quality")?.toString() || ""}
            onChange={(e) => handleFilterChange("quality", e.target.value)}
            className={selectClass}
          >
            <option value="">Todas</option>
            <option value="cold">Frio</option>
            <option value="warm">Morno</option>
            <option value="hot">Quente</option>
          </select>
        </div>

        {/* ICP */}
        {icps.length > 0 && (
          <div className="min-w-[140px]">
            <FilterLabel>ICP</FilterLabel>
            <select
              value={searchParams.get("icpId")?.toString() || ""}
              onChange={(e) => handleFilterChange("icpId", e.target.value)}
              className={selectClass}
            >
              <option value="">Todos</option>
              {icps.map((icp) => (
                <option key={icp.id} value={icp.id}>
                  {icp.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cadência */}
        <div className="min-w-[130px]">
          <FilterLabel>Cadência</FilterLabel>
          <select
            value={searchParams.get("hasCadence")?.toString() || ""}
            onChange={(e) => handleFilterChange("hasCadence", e.target.value)}
            className={selectClass}
          >
            <option value="">Todas</option>
            <option value="no">Sem cadência</option>
            <option value="yes">Com cadência</option>
          </select>
        </div>

        {/* Pesquisa IA */}
        <div className="min-w-[140px]">
          <FilterLabel>Pesquisa IA</FilterLabel>
          <select
            value={searchParams.get("hasDeepResearch")?.toString() || ""}
            onChange={(e) => handleFilterChange("hasDeepResearch", e.target.value)}
            className={selectClass}
          >
            <option value="">Todas</option>
            <option value="yes">Com pesquisa</option>
            <option value="no">Sem pesquisa</option>
          </select>
        </div>

        {/* Arquivados */}
        <div className="min-w-[120px]">
          <FilterLabel>Situação</FilterLabel>
          <select
            value={searchParams.get("archived")?.toString() || ""}
            onChange={(e) => handleFilterChange("archived", e.target.value)}
            className={selectClass}
          >
            <option value="">Ativos</option>
            <option value="yes">Arquivados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        {/* Grupo de origem */}
        <div className="min-w-[160px]">
          <FilterLabel>Grupo de origem</FilterLabel>
          <select
            value={searchParams.get("sourceGroup")?.toString() || ""}
            onChange={(e) => handleFilterChange("sourceGroup", e.target.value)}
            className={selectClass}
          >
            <option value="">Todos os grupos</option>
            <option value="__none__">Sem grupo</option>
            {sourceGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
