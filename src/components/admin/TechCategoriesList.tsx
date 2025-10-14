"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  toggleTechCategoryActive,
  deleteTechCategory,
} from "@/actions/tech-categories";
import { Eye, EyeOff, Trash2 } from "lucide-react";

interface TechCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  _count: {
    dealTechStacks: number;
  };
}

interface TechCategoriesListProps {
  categories: TechCategory[];
}

export function TechCategoriesList({ categories }: TechCategoriesListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleActive = async (id: string) => {
    setLoading(id);
    try {
      await toggleTechCategoryActive(id);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar categoria";
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string, dealCount: number) => {
    if (dealCount > 0) {
      alert(
        `Não é possível excluir "${name}" pois possui ${dealCount} deal(s) vinculado(s).`
      );
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      return;
    }

    setLoading(id);
    try {
      await deleteTechCategory(id);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir categoria";
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Nenhuma categoria cadastrada
        </h3>
        <p className="mt-2 text-gray-500">
          Crie sua primeira categoria para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div
          key={category.id}
          className={`rounded-lg border bg-white p-4 shadow-sm ${
            !category.isActive ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {category.color && (
                  <span
                    className="inline-block h-4 w-4 rounded"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                {category.icon && <span>{category.icon}</span>}
                <h3 className="text-lg font-semibold text-gray-900">
                  {category.name}
                </h3>
                {!category.isActive && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Inativa
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-600">
                <span className="font-mono text-xs text-gray-400">
                  {category.slug}
                </span>
                {category.description && (
                  <>
                    {" • "}
                    {category.description}
                  </>
                )}
              </p>

              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{category._count.dealTechStacks} deal(s)</span>
                <span>Ordem: {category.order}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleActive(category.id)}
                disabled={loading === category.id}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                title={category.isActive ? "Desativar" : "Ativar"}
              >
                {category.isActive ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() =>
                  handleDelete(
                    category.id,
                    category.name,
                    category._count.dealTechStacks
                  )
                }
                disabled={loading === category.id || category._count.dealTechStacks > 0}
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
