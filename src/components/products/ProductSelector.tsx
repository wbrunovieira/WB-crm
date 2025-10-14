"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  businessLine: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface SelectedProduct {
  productId: string;
  productName: string;
  businessLineName: string;
  businessLineColor: string | null;
  interestLevel?: "high" | "medium" | "low";
  notes?: string;
}

interface ProductSelectorProps {
  selectedProducts: SelectedProduct[];
  onChange: (products: SelectedProduct[]) => void;
  showInterestLevel?: boolean;
  showNotes?: boolean;
}

export function ProductSelector({
  selectedProducts,
  onChange,
  showInterestLevel = false,
  showNotes = false,
}: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products/active");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const handleAddProduct = () => {
    if (!selectedProductId) return;

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Verificar se já foi adicionado
    if (selectedProducts.some((sp) => sp.productId === product.id)) {
      alert("Este produto já foi adicionado");
      return;
    }

    const newProduct: SelectedProduct = {
      productId: product.id,
      productName: product.name,
      businessLineName: product.businessLine.name,
      businessLineColor: product.businessLine.color,
      interestLevel: showInterestLevel ? "medium" : undefined,
      notes: showNotes ? "" : undefined,
    };

    onChange([...selectedProducts, newProduct]);
    setSelectedProductId("");
  };

  const handleRemoveProduct = (productId: string) => {
    onChange(selectedProducts.filter((sp) => sp.productId !== productId));
  };

  const handleUpdateProduct = (
    productId: string,
    field: keyof SelectedProduct,
    value: any
  ) => {
    onChange(
      selectedProducts.map((sp) =>
        sp.productId === productId ? { ...sp, [field]: value } : sp
      )
    );
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Carregando produtos...</div>;
  }

  // Agrupar produtos por linha de negócio
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
    <div className="space-y-4">
      {/* Seletor de Produtos */}
      <div className="flex gap-2">
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione um produto...</option>
          {Object.values(groupedProducts).map((group) => (
            <optgroup key={group.name} label={group.name}>
              {group.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAddProduct}
          disabled={!selectedProductId}
          className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Adicionar
        </button>
      </div>

      {/* Lista de Produtos Selecionados */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          {selectedProducts.map((selectedProduct) => (
            <div
              key={selectedProduct.productId}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          selectedProduct.businessLineColor || "#792990",
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      {selectedProduct.businessLineName}
                    </span>
                  </div>
                  <h4 className="mt-1 font-medium text-gray-900">
                    {selectedProduct.productName}
                  </h4>

                  {showInterestLevel && (
                    <div className="mt-2">
                      <label className="text-xs text-gray-600">
                        Nível de interesse:
                      </label>
                      <select
                        value={selectedProduct.interestLevel || "medium"}
                        onChange={(e) =>
                          handleUpdateProduct(
                            selectedProduct.productId,
                            "interestLevel",
                            e.target.value
                          )
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        <option value="high">Alto</option>
                        <option value="medium">Médio</option>
                        <option value="low">Baixo</option>
                      </select>
                    </div>
                  )}

                  {showNotes && (
                    <div className="mt-2">
                      <label className="text-xs text-gray-600">
                        Observações:
                      </label>
                      <textarea
                        value={selectedProduct.notes || ""}
                        onChange={(e) =>
                          handleUpdateProduct(
                            selectedProduct.productId,
                            "notes",
                            e.target.value
                          )
                        }
                        rows={2}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        placeholder="Observações sobre o interesse neste produto..."
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleRemoveProduct(selectedProduct.productId)
                  }
                  className="ml-2 text-gray-400 hover:text-red-600"
                  title="Remover produto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
