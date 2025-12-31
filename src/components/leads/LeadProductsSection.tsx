"use client";

import { useState, useEffect } from "react";
import { getLeadProducts, removeProductFromLead } from "@/actions/product-links";
import { X, Package } from "lucide-react";

interface LeadProductsSectionProps {
  leadId: string;
  isConverted: boolean;
}

interface LeadProduct {
  id: string;
  interestLevel: string | null;
  estimatedValue: number | null;
  notes: string | null;
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

const interestLevelLabels: Record<string, string> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const interestLevelColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

export function LeadProductsSection({ leadId, isConverted }: LeadProductsSectionProps) {
  const [products, setProducts] = useState<LeadProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getLeadProducts(leadId);
        setProducts(data);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [leadId]);

  const refreshProducts = async () => {
    try {
      const data = await getLeadProducts(leadId);
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const handleRemove = async (id: string, productName: string) => {
    if (!confirm(`Remover "${productName}" deste lead?`)) return;

    setRemoving(id);
    try {
      await removeProductFromLead(id);
      await refreshProducts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao remover produto");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-6 w-6 text-gray-500" />
          <h2 className="text-xl font-bold text-gray-900">Produtos de Interesse</h2>
        </div>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-6 w-6 text-gray-500" />
          <h2 className="text-xl font-bold text-gray-900">Produtos de Interesse</h2>
        </div>
        <p className="text-sm text-gray-500">
          Nenhum produto vinculado a este lead.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📦</span>
          <h2 className="text-xl font-bold text-gray-900">Produtos de Interesse</h2>
          <span className="text-sm text-gray-500">({products.length})</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:shadow-md transition-shadow"
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
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  {item.product.name}
                </h3>
                {item.product.description && (
                  <p className="mt-1 text-sm text-gray-600">
                    {item.product.description}
                  </p>
                )}
              </div>

              {!isConverted && (
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

            <div className="space-y-2">
              {item.interestLevel && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Interesse:
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${interestLevelColors[item.interestLevel]}`}
                  >
                    {interestLevelLabels[item.interestLevel]}
                  </span>
                </div>
              )}

              {item.estimatedValue && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Valor Estimado:
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(item.estimatedValue)}
                  </span>
                </div>
              )}

              {item.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                    Observações:
                  </span>
                  <p className="text-sm text-gray-700">{item.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
