"use client";

import { X, Package } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  usePartnerProducts,
  useRemovePartnerProduct,
  type PartnerProductLink,
} from "@/hooks/product-links/use-product-links";

const expertiseLabels: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  expert: "Especialista",
};

const expertiseColors: Record<string, string> = {
  basic: "bg-blue-100 text-blue-800 border-blue-200",
  intermediate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  expert: "bg-green-100 text-green-800 border-green-200",
};

function formatCommission(p: PartnerProductLink): string | null {
  if (p.commissionValue == null) return null;
  if (p.commissionType === "percentage") return `${p.commissionValue}%`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.commissionValue);
}

export function PartnerProductsSection({ partnerId }: { partnerId: string }) {
  const { data: products = [], isLoading: loading } = usePartnerProducts(partnerId);
  const removeMutation = useRemovePartnerProduct();
  const { confirm, dialogProps } = useConfirmDialog();

  async function handleRemove(item: PartnerProductLink) {
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Remover "${item.productName}" deste parceiro?`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await removeMutation.mutateAsync({ partnerId, productId: item.productId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover produto");
    }
  }

  const header = (
    <div className="mb-4 flex items-center gap-2">
      <Package className="h-6 w-6 text-gray-500" />
      <h2 className="text-lg font-semibold text-gray-900">Produtos / Expertise</h2>
      {!loading && products.length > 0 && (
        <span className="text-sm text-gray-500">({products.length})</span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div id="produtos" className="mt-6 scroll-mt-52 rounded-lg bg-white p-6 shadow">
        {header}
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div id="produtos" className="mt-6 scroll-mt-52 rounded-lg bg-white p-6 shadow">
        {header}
        <p className="text-sm text-gray-500">Nenhum produto vinculado a este parceiro.</p>
      </div>
    );
  }

  return (
    <>
      <div id="produtos" className="mt-6 scroll-mt-52 rounded-lg bg-white p-6 shadow">
        {header}
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((item) => {
            const commission = formatCommission(item);
            return (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-900">{item.productName}</h3>
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    disabled={removeMutation.isPending}
                    className="ml-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title="Remover produto"
                    aria-label={`Remover ${item.productName}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {item.expertiseLevel && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${expertiseColors[item.expertiseLevel] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
                    >
                      {expertiseLabels[item.expertiseLevel] ?? item.expertiseLevel}
                    </span>
                  )}
                  {item.canRefer && (
                    <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                      Pode indicar
                    </span>
                  )}
                  {item.canDeliver && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Pode entregar
                    </span>
                  )}
                </div>

                {commission && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Comissão:</span>
                    <span className="text-sm font-bold text-primary">{commission}</span>
                  </div>
                )}

                {item.notes && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <p className="text-sm text-gray-700">{item.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog {...dialogProps} />
    </>
  );
}
