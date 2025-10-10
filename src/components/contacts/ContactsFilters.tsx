"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { Search, Filter } from "lucide-react";

export function ContactsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);

    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar contatos por nome, email ou telefone..."
            defaultValue={searchParams.get("search")?.toString()}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtros:</span>
        </div>

        <select
          value={searchParams.get("status")?.toString() || ""}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="bounced">Bounced</option>
        </select>

        <select
          value={searchParams.get("company")?.toString() || ""}
          onChange={(e) => handleFilterChange("company", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas as empresas</option>
          <option value="organization">Organizações</option>
          <option value="lead">Leads</option>
          <option value="partner">Parceiros</option>
          <option value="none">Sem empresa</option>
        </select>

        <select
          value={searchParams.get("groupBy")?.toString() || ""}
          onChange={(e) => handleFilterChange("groupBy", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Sem agrupamento</option>
          <option value="organization">Agrupar por organização</option>
          <option value="department">Agrupar por departamento</option>
          <option value="status">Agrupar por status</option>
        </select>

        {(searchParams.get("search") ||
          searchParams.get("status") ||
          searchParams.get("company") ||
          searchParams.get("groupBy")) && (
          <button
            onClick={() => router.replace(pathname)}
            className="text-sm text-gray-600 hover:text-primary underline"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
