"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";

interface Props {
  initialQuery: string;
}

export default function OperationsSearchForm({ initialQuery }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    router.push(`/admin/operations${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialQuery}
          placeholder="Buscar lead ou organização..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
      >
        Buscar
      </button>
    </form>
  );
}
