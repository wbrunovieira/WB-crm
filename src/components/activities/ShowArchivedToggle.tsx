"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive } from "lucide-react";

export function ShowArchivedToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = searchParams.get("showArchived") === "true";

  const handleToggle = () => {
    const params = new URLSearchParams(searchParams);
    if (isActive) {
      params.delete("showArchived");
    } else {
      params.set("showArchived", "true");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
      title={isActive ? "Ocultar atividades de leads arquivados" : "Mostrar atividades de leads arquivados"}
    >
      <Archive className="h-4 w-4" />
      {isActive ? "Arquivados" : "Arquivados"}
    </button>
  );
}
