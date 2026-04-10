"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  label?: string;
}

/** Volta no histórico do browser */
export default function BackButton({ label = "Voltar" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
