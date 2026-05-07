"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Search, X } from "lucide-react";

export function ActivitiesLeadSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("leadSearch") ?? "";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("leadSearch", value.trim());
    } else {
      params.delete("leadSearch");
    }
    router.push(`/activities?${params.toString()}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(e.target.value), 400);
  };

  const handleClear = () => {
    push("");
  };

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        defaultValue={current}
        onChange={handleChange}
        placeholder="Buscar por lead..."
        className="h-9 w-48 rounded-md border border-gray-300 bg-white pl-8 pr-8 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {current && (
        <button
          onClick={handleClear}
          className="absolute right-2 text-gray-400 hover:text-gray-600"
          title="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
