"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  toggleTechProfileLanguageActive,
  deleteTechProfileLanguage,
  toggleTechProfileFrameworkActive,
  deleteTechProfileFramework,
  toggleTechProfileHostingActive,
  deleteTechProfileHosting,
  toggleTechProfileDatabaseActive,
  deleteTechProfileDatabase,
  toggleTechProfileERPActive,
  deleteTechProfileERP,
  toggleTechProfileCRMActive,
  deleteTechProfileCRM,
  toggleTechProfileEcommerceActive,
  deleteTechProfileEcommerce,
} from "@/actions/tech-profile-options";
import { Eye, EyeOff, Trash2 } from "lucide-react";

type TechProfileType = "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";

interface TechProfileGenericListProps {
  type: TechProfileType;
  items: any[];
  countKeys: { lead: string; org: string };
}

export function TechProfileGenericList({ type, items, countKeys }: TechProfileGenericListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleActive = async (id: string) => {
    setLoading(id);
    try {
      switch (type) {
        case "languages": await toggleTechProfileLanguageActive(id); break;
        case "frameworks": await toggleTechProfileFrameworkActive(id); break;
        case "hosting": await toggleTechProfileHostingActive(id); break;
        case "databases": await toggleTechProfileDatabaseActive(id); break;
        case "erps": await toggleTechProfileERPActive(id); break;
        case "crms": await toggleTechProfileCRMActive(id); break;
        case "ecommerces": await toggleTechProfileEcommerceActive(id); break;
      }
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar";
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string, totalCount: number) => {
    if (totalCount > 0) {
      alert(
        `Não é possível excluir "${name}" pois possui ${totalCount} lead(s)/organização(ões) vinculado(s).`
      );
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      return;
    }

    setLoading(id);
    try {
      switch (type) {
        case "languages": await deleteTechProfileLanguage(id); break;
        case "frameworks": await deleteTechProfileFramework(id); break;
        case "hosting": await deleteTechProfileHosting(id); break;
        case "databases": await deleteTechProfileDatabase(id); break;
        case "erps": await deleteTechProfileERP(id); break;
        case "crms": await deleteTechProfileCRM(id); break;
        case "ecommerces": await deleteTechProfileEcommerce(id); break;
      }
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir";
      alert(message);
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
    <div className="space-y-3">
      {items.map((item) => {
        const leadCount = (item._count as any)[countKeys.lead] || 0;
        const orgCount = (item._count as any)[countKeys.org] || 0;
        const totalCount = leadCount + orgCount;

        return (
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
                  {item.type && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {item.type}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-mono text-xs text-gray-400">
                    {item.slug}
                  </span>
                </p>

                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>{totalCount} vinculação(ões)</span>
                  {totalCount > 0 && (
                    <span className="text-xs">
                      ({leadCount} leads, {orgCount} organizations)
                    </span>
                  )}
                  <span>Ordem: {item.order}</span>
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
                  onClick={() => handleDelete(item.id, item.name, totalCount)}
                  disabled={loading === item.id || totalCount > 0}
                  className="rounded-md p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Excluir"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
