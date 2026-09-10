"use client";

import { X, Package } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  useOrganizationProducts,
  useRemoveOrganizationProduct,
} from "@/hooks/product-links/use-product-links";

/**
 * Produtos de um CLIENTE — equivalente ao LeadProductsSection, não cópia.
 *
 * A diferença é de domínio e é intencional: no lead o vínculo registra INTERESSE (nível de
 * interesse, valor estimado); no cliente registra HISTÓRICO DE COMPRA (status, primeira e
 * última compra, quantas vezes, quanto rendeu). Forçar a mesma tela nos dois lados esconderia
 * a informação que só existe depois que alguém virou cliente.
 */

const STATUS_LABEL: Record<string, { label: string; classe: string }> = {
  purchased: { label: "Comprado", classe: "border-green-600/50 bg-green-900/40 text-green-300" },
  interested: { label: "Interessado", classe: "border-amber-600/50 bg-amber-900/40 text-amber-300" },
  declined: { label: "Recusou", classe: "border-gray-600/50 bg-gray-800/40 text-gray-400" },
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function OrganizationProductsSection({ organizationId }: { organizationId: string }) {
  const { data: produtos, isLoading } = useOrganizationProducts(organizationId);
  const remover = useRemoveOrganizationProduct();
  const { confirm, dialogProps } = useConfirmDialog();

  async function handleRemover(productId: string, nome: string) {
    const ok = await confirm({
      title: "Remover produto",
      message: `Remover "${nome}" do histórico deste cliente?`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remover.mutateAsync({ organizationId, productId });
      toast.success("Produto removido");
    } catch {
      toast.error("Não foi possível remover o produto");
    }
  }

  return (
    <div className="rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3">
        <Package size={16} className="text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
          Produtos {produtos && produtos.length > 0 ? `(${produtos.length})` : ""}
        </h2>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Carregando…</p>}

      {!isLoading && (!produtos || produtos.length === 0) && (
        <p className="text-sm text-gray-500">Nenhum produto registrado para este cliente.</p>
      )}

      <div className="space-y-2">
        {produtos?.map((p) => {
          const primeira = dataCurta(p.firstPurchaseAt);
          const ultima = dataCurta(p.lastPurchaseAt);
          const status = STATUS_LABEL[p.status] ?? { label: p.status, classe: "border-gray-600/50 bg-gray-800/40 text-gray-400" };
          return (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-purple-900/30 bg-purple-950/20 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{p.productName}</span>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${status.classe}`}>
                    {status.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  {p.totalPurchases > 0 && <span>{p.totalPurchases}× comprado</span>}
                  {p.totalRevenue > 0 && <span>{moeda(p.totalRevenue)}</span>}
                  {primeira && <span>1ª compra {primeira}</span>}
                  {ultima && ultima !== primeira && <span>última {ultima}</span>}
                </div>
                {p.notes && <p className="mt-1 text-xs text-gray-600">{p.notes}</p>}
              </div>
              <button
                onClick={() => handleRemover(p.productId, p.productName)}
                className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-900/30 hover:text-red-400"
                title="Remover produto"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
