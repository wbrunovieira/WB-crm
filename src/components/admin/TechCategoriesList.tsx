"use client";

import { useState } from "react";
import {
  useTechOptions,
  useToggleTechOption,
  useDeleteTechOption,
} from "@/hooks/admin/use-admin";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

export function TechCategoriesList() {
  const { data: categories = [] } = useTechOptions("tech-category");
  const toggleMutation = useToggleTechOption("tech-category");
  const deleteMutation = useDeleteTechOption("tech-category");

  const [loading, setLoading] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const handleToggleActive = async (id: string) => {
    setLoading(id);
    try {
      await toggleMutation.mutateAsync(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar categoria";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Tem certeza que deseja excluir "${name}"?`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!confirmed) return;

    setLoading(id);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir categoria";
      toast.error(message);
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
    <>
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
                <span>Ordem: {category.order ?? 0}</span>
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
                onClick={() => handleDelete(category.id, category.name)}
                disabled={loading === category.id}
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
    <ConfirmDialog {...dialogProps} />
    </>
  );
}
