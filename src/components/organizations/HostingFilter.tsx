"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Server } from "lucide-react";

interface HostingFilterProps {
  currentValue?: string;
}

export function HostingFilter({ currentValue }: HostingFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete("hasHosting");
    } else {
      params.set("hasHosting", value);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Server className="h-4 w-4 text-gray-500" />
      <select
        value={currentValue || "all"}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="all">Todas</option>
        <option value="true">Com Hospedagem</option>
        <option value="false">Sem Hospedagem</option>
      </select>
    </div>
  );
}
