"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { Search } from "lucide-react";

export function LeadsFilters() {
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
    <div className="mb-6 flex gap-4">
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar leads..."
          defaultValue={searchParams.get("search")?.toString()}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <select
        value={searchParams.get("status")?.toString() || ""}
        onChange={(e) => handleFilterChange("status", e.target.value)}
        className="rounded-md border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Todos os status</option>
        <option value="new">Novo</option>
        <option value="contacted">Contatado</option>
        <option value="qualified">Qualificado</option>
        <option value="disqualified">Desqualificado</option>
      </select>
      <select
        value={searchParams.get("quality")?.toString() || ""}
        onChange={(e) => handleFilterChange("quality", e.target.value)}
        className="rounded-md border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">Todas as qualidades</option>
        <option value="cold">Frio</option>
        <option value="warm">Morno</option>
        <option value="hot">Quente</option>
      </select>
    </div>
  );
}
