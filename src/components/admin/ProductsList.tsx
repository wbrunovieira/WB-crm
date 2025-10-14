"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleProductActive, deleteProduct } from "@/actions/products";
import { Eye, EyeOff, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number | null;
  currency: string;
  pricingType: string | null;
  isActive: boolean;
  order: number;
  businessLine: {
    id: string;
    name: string;
    color: string | null;
  };
  _count: {
    leadProducts: number;
    organizationProducts: number;
    dealProducts: number;
    partnerProducts: number;
  };
}

interface ProductsListProps {
  products: Product[];
}

export function ProductsList({ products }: ProductsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleActive = async (id: string) => {
    setLoading(id);
    try {
      await toggleProductActive(id);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Erro ao atualizar produto");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string, totalLinks: number) => {
    if (totalLinks > 0) {
      alert(
        `Não é possível excluir "${name}" pois possui ${totalLinks} vínculo(s) ativo(s).`
      );
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      return;
    }

    setLoading(id);
    try {
      await deleteProduct(id);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Erro ao excluir produto");
    } finally {
      setLoading(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Nenhum produto cadastrado
        </h3>
        <p className="mt-2 text-gray-500">
          Crie seu primeiro produto para começar.
        </p>
      </div>
    );
  }

  // Agrupar por linha de negócio
  const groupedProducts = products.reduce((acc, product) => {
    const lineId = product.businessLine.id;
    if (!acc[lineId]) {
      acc[lineId] = {
        name: product.businessLine.name,
        color: product.businessLine.color,
        products: [],
      };
    }
    acc[lineId].products.push(product);
    return acc;
  }, {} as Record<string, { name: string; color: string | null; products: Product[] }>);

  return (
    <div className="space-y-6">
      {Object.values(groupedProducts).map((group) => (
        <div key={group.name}>
          <div className="mb-3 flex items-center gap-2">
            {group.color && (
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: group.color }}
              />
            )}
            <h3 className="text-lg font-semibold text-gray-700">
              {group.name}
            </h3>
            <span className="text-sm text-gray-500">
              ({group.products.length})
            </span>
          </div>

          <div className="space-y-2">
            {group.products.map((product) => {
              const totalLinks =
                product._count.leadProducts +
                product._count.organizationProducts +
                product._count.dealProducts +
                product._count.partnerProducts;

              return (
                <div
                  key={product.id}
                  className={`rounded-lg border bg-white p-4 shadow-sm ${
                    !product.isActive ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {product.name}
                        </h4>
                        {!product.isActive && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Inativo
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-mono text-xs text-gray-400">
                          {product.slug}
                        </span>
                        {product.description && (
                          <>
                            {" • "}
                            {product.description}
                          </>
                        )}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {product.basePrice && (
                          <span className="font-medium text-primary">
                            R$ {product.basePrice.toFixed(2)}
                            {product.pricingType && (
                              <span className="ml-1 text-xs text-gray-400">
                                ({product.pricingType})
                              </span>
                            )}
                          </span>
                        )}
                        <span>Leads: {product._count.leadProducts}</span>
                        <span>Orgs: {product._count.organizationProducts}</span>
                        <span>Deals: {product._count.dealProducts}</span>
                        <span>Partners: {product._count.partnerProducts}</span>
                        <span>Ordem: {product.order}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(product.id)}
                        disabled={loading === product.id}
                        className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                        title={product.isActive ? "Desativar" : "Ativar"}
                      >
                        {product.isActive ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <EyeOff className="h-5 w-5" />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(product.id, product.name, totalLinks)
                        }
                        disabled={loading === product.id || totalLinks > 0}
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
        </div>
      ))}
    </div>
  );
}
