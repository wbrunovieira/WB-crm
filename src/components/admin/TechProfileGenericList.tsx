"use client";

import { useState } from "react";
import {
  useTechOptions,
  useToggleTechOption,
  useDeleteTechOption,
  type TechOptionType,
} from "@/hooks/admin/use-admin";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

type TechProfileType = "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";

const TYPE_MAP: Record<TechProfileType, TechOptionType> = {
  languages: "profile-language",
  frameworks: "profile-framework",
  hosting: "profile-hosting",
  databases: "profile-database",
  erps: "profile-erp",
  crms: "profile-crm",
  ecommerces: "profile-ecommerce",
};

interface TechProfileGenericListProps {
  type: TechProfileType;
}

export function TechProfileGenericList({ type }: TechProfileGenericListProps) {
  const optionType = TYPE_MAP[type];
  const { data: items = [] } = useTechOptions(optionType);
  const toggleMutation = useToggleTechOption(optionType);
  const deleteMutation = useDeleteTechOption(optionType);

  const [loading, setLoading] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const handleToggleActive = async (id: string) => {
    setLoading(id);
    try {
      await toggleMutation.mutateAsync(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar";
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
      const message = error instanceof Error ? error.message : "Erro ao excluir";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Nenhum item cadastrado
        </h3>
        <p className="mt-2 text-gray-500">
          Crie seu primeiro item para começar.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-lg border bg-white p-4 shadow-sm ${
            !item.isActive ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {item.color && (
                  <span
                    className="inline-block h-4 w-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                {item.icon && <span>{item.icon}</span>}
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.name}
                </h3>
                {!item.isActive && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Inativo
                  </span>
                )}
                {item.subType && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {item.subType}
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-600">
                <span className="font-mono text-xs text-gray-400">
                  {item.slug}
                </span>
              </p>

              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>Ordem: {item.order ?? 0}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleActive(item.id)}
                disabled={loading === item.id}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                title={item.isActive ? "Desativar" : "Ativar"}
              >
                {item.isActive ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => handleDelete(item.id, item.name)}
                disabled={loading === item.id}
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
