"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  toggleBusinessLineActive,
  deleteBusinessLine,
} from "@/actions/business-lines";
import { Eye, EyeOff, Trash2 } from "lucide-react";

interface BusinessLine {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  order: number;
  _count: {
    products: number;
  };
}

interface BusinessLinesListProps {
  businessLines: BusinessLine[];
}

export function BusinessLinesList({ businessLines }: BusinessLinesListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleActive = async (id: string) => {
    setLoading(id);
    try {
      await toggleBusinessLineActive(id);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Erro ao atualizar linha de negócio");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string, productCount: number) => {
    if (productCount > 0) {
      alert(
        `Não é possível excluir "${name}" pois possui ${productCount} produto(s) vinculado(s).`
      );
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      return;
    }

    setLoading(id);
    try {
      await deleteBusinessLine(id);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Erro ao excluir linha de negócio");
    } finally {
      setLoading(null);
    }
  };

  if (businessLines.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Nenhuma linha de negócio cadastrada
        </h3>
        <p className="mt-2 text-gray-500">
          Crie sua primeira linha de negócio para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {businessLines.map((line) => (
        <div
          key={line.id}
          className={`rounded-lg border bg-white p-4 shadow-sm ${
            !line.isActive ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {line.color && (
                  <span
                    className="inline-block h-4 w-4 rounded"
                    style={{ backgroundColor: line.color }}
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {line.name}
                </h3>
                {!line.isActive && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Inativa
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-600">
                <span className="font-mono text-xs text-gray-400">
                  {line.slug}
                </span>
                {line.description && (
                  <>
                    {" • "}
                    {line.description}
                  </>
                )}
              </p>

              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{line._count.products} produto(s)</span>
                {line.icon && (
                  <span className="font-mono text-xs">Ícone: {line.icon}</span>
                )}
                <span>Ordem: {line.order}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleActive(line.id)}
                disabled={loading === line.id}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                title={line.isActive ? "Desativar" : "Ativar"}
              >
                {line.isActive ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() =>
                  handleDelete(line.id, line.name, line._count.products)
                }
                disabled={loading === line.id || line._count.products > 0}
                className="rounded-md p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                title="Excluir"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
