"use client";

import { useState, useEffect } from "react";
import { getAllDealProducts, removeProductFromDeal } from "@/actions/product-links";
import { X, Package, Plus } from "lucide-react";
import { AddProductToDealModal } from "./AddProductToDealModal";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

interface DealProductsSectionProps {
  dealId: string;
}

interface DealProduct {
  id: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalValue: number;
  status: string;
  removedAt: string | null;
  description: string | null;
  deliveryTime: number | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    businessLine: {
      name: string;
      color: string | null;
    };
  };
}

const statusLabels: Record<string, string> = {
  removed: "Removido",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  removed: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-amber-100 text-amber-700 border-amber-200",
};

export function DealProductsSection({ dealId }: DealProductsSectionProps) {
  const [products, setProducts] = useState<DealProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getAllDealProducts(dealId);
        setProducts(data);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [dealId]);

  const refreshProducts = async () => {
    try {
      const data = await getAllDealProducts(dealId);
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const handleRemove = async (id: string, productName: string) => {
    const confirmed = await confirm({
      title: "Remover Produto",
      message: `Remover "${productName}" deste deal? O produto ficará no histórico.`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!confirmed) return;

    setRemoving(id);
    try {
      await removeProductFromDeal(id);
      await refreshProducts();
      toast.success(`"${productName}" removido com sucesso`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover produto");
    } finally {
      setRemoving(null);
    }
  };

  const activeProducts = products.filter((p) => p.status === "active");
  const inactiveProducts = products.filter((p) => p.status !== "active");
  const grandTotal = activeProducts.reduce((sum, item) => sum + item.totalValue, 0);

  if (loading) {
    return (
      <>
        <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900">Produtos do Deal</h2>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Adicionar Produto
            </button>
          </div>
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
        <AddProductToDealModal
          dealId={dealId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refreshProducts}
        />
      </>
    );
  }

  if (products.length === 0) {
    return (
      <>
        <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900">Produtos do Deal</h2>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Adicionar Produto
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Nenhum produto vinculado a este deal.
          </p>
        </div>
        <AddProductToDealModal
          dealId={dealId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={refreshProducts}
        />
      </>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const renderProductCard = (item: DealProduct) => {
    const isInactive = item.status !== "active";

    return (
      <div
        key={item.id}
        className={`rounded-lg border p-4 transition-shadow ${
          isInactive
            ? "border-gray-200 bg-gray-100 opacity-60"
            : "border-gray-200 bg-gray-50 hover:shadow-md"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: item.product.businessLine.color || "#792990",
                }}
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {item.product.businessLine.name}
              </span>
              {isInactive && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    statusColors[item.status] || "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {statusLabels[item.status] || item.status}
                </span>
              )}
            </div>
            <h3 className={`text-base font-semibold ${isInactive ? "text-gray-500 line-through" : "text-gray-900"}`}>
              {item.product.name}
            </h3>
            {item.product.description && (
              <p className="mt-1 text-sm text-gray-600">
                {item.product.description}
              </p>
            )}
          </div>

          {!isInactive && (
            <button
              onClick={() => handleRemove(item.id, item.product.name)}
              disabled={removing === item.id}
              className="ml-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
              title="Remover produto"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Quantidade
            </span>
            <span className="text-sm font-bold text-gray-900">
              {item.quantity}x
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Preço Unit.
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(item.unitPrice)}
            </span>
          </div>

          {item.discount > 0 && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Desconto
              </span>
              <span className="text-sm font-bold text-red-600">
                -{formatCurrency(item.discount)}
              </span>
            </div>
          )}

          {item.deliveryTime && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Prazo
              </span>
              <span className="text-sm font-bold text-blue-600">
                {item.deliveryTime} dias
              </span>
            </div>
          )}
        </div>

        {item.description && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Descrição / Customizações:
            </span>
            <p className="text-sm text-gray-700">{item.description}</p>
          </div>
        )}

        <div className={`mt-3 pt-3 border-t border-gray-200 rounded-md p-2 ${isInactive ? "bg-gray-50" : "bg-white"}`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-600">
              Valor Total:
            </span>
            <span className={`text-lg font-bold ${isInactive ? "text-gray-400 line-through" : "text-primary"}`}>
              {formatCurrency(item.totalValue)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <h2 className="text-xl font-bold text-gray-900">Produtos do Deal</h2>
            <span className="text-sm text-gray-500">({activeProducts.length})</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar Produto
          </button>
        </div>

        {/* Active Products */}
        <div className="space-y-4">
          {activeProducts.map(renderProductCard)}
        </div>

        {/* Grand Total (active only) */}
        {activeProducts.length > 0 && (
          <div className="mt-6 rounded-lg border-2 border-primary bg-purple-50 p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-primary">
                Valor Total do Deal:
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Inactive Products (removed/cancelled) */}
        {inactiveProducts.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dashed border-gray-300">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Produtos Removidos / Cancelados ({inactiveProducts.length})
            </h3>
            <div className="space-y-3">
              {inactiveProducts.map(renderProductCard)}
            </div>
          </div>
        )}
      </div>

    <AddProductToDealModal
      dealId={dealId}
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSuccess={refreshProducts}
    />
    <ConfirmDialog {...dialogProps} />
    </>
  );
}
