"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number | null;
  currency: string;
  businessLine: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface DealProduct {
  productId: string;
  productName: string;
  businessLineName: string;
  businessLineColor: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalValue: number;
  description?: string;
  deliveryTime?: number;
}

interface DealProductsFormProps {
  selectedProducts: DealProduct[];
  onChange: (products: DealProduct[]) => void;
}

export function DealProductsForm({
  selectedProducts,
  onChange,
}: DealProductsFormProps) {
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

  const calculateTotalValue = (
    quantity: number,
    unitPrice: number,
    discount: number
  ) => {
    return quantity * unitPrice - discount;
  };

  const handleAddProduct = () => {
    if (!selectedProductId) return;

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    if (selectedProducts.some((sp) => sp.productId === product.id)) {
      alert("Este produto já foi adicionado");
      return;
    }

    const unitPrice = product.basePrice || 0;
    const quantity = 1;
    const discount = 0;

    const newProduct: DealProduct = {
      productId: product.id,
      productName: product.name,
      businessLineName: product.businessLine.name,
      businessLineColor: product.businessLine.color,
      quantity,
      unitPrice,
      discount,
      totalValue: calculateTotalValue(quantity, unitPrice, discount),
      description: "",
      deliveryTime: undefined,
    };

    onChange([...selectedProducts, newProduct]);
    setSelectedProductId("");
  };

  const handleRemoveProduct = (productId: string) => {
    onChange(selectedProducts.filter((sp) => sp.productId !== productId));
  };

  const handleUpdateProduct = (
    productId: string,
    field: keyof DealProduct,
    value: any
  ) => {
    onChange(
      selectedProducts.map((sp) => {
        if (sp.productId !== productId) return sp;

        const updated = { ...sp, [field]: value };

        // Recalcular total se mudou quantidade, preço ou desconto
        if (field === "quantity" || field === "unitPrice" || field === "discount") {
          updated.totalValue = calculateTotalValue(
            field === "quantity" ? value : updated.quantity,
            field === "unitPrice" ? value : updated.unitPrice,
            field === "discount" ? value : updated.discount
          );
        }

        return updated;
      })
    );
  };

  const grandTotal = selectedProducts.reduce(
    (sum, product) => sum + product.totalValue,
    0
  );

  if (loading) {
    return <div className="text-sm text-gray-500">Carregando produtos...</div>;
  }

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
                  {product.name} {product.basePrice && `- R$ ${product.basePrice.toFixed(2)}`}
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

      {/* Lista de Produtos com Pricing */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3">
          {selectedProducts.map((dealProduct) => (
            <div
              key={dealProduct.productId}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: dealProduct.businessLineColor || "#792990",
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      {dealProduct.businessLineName}
                    </span>
                  </div>
                  <h4 className="mt-1 font-medium text-gray-900">
                    {dealProduct.productName}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(dealProduct.productId)}
                  className="text-gray-400 hover:text-red-600"
                  title="Remover produto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dealProduct.quantity}
                    onChange={(e) =>
                      handleUpdateProduct(
                        dealProduct.productId,
                        "quantity",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Preço Unitário (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dealProduct.unitPrice}
                    onChange={(e) =>
                      handleUpdateProduct(
                        dealProduct.productId,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dealProduct.discount}
                    onChange={(e) =>
                      handleUpdateProduct(
                        dealProduct.productId,
                        "discount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Prazo de Entrega (dias)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dealProduct.deliveryTime || ""}
                    onChange={(e) =>
                      handleUpdateProduct(
                        dealProduct.productId,
                        "deliveryTime",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Descrição / Customizações
                </label>
                <textarea
                  value={dealProduct.description || ""}
                  onChange={(e) =>
                    handleUpdateProduct(
                      dealProduct.productId,
                      "description",
                      e.target.value
                    )
                  }
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Detalhes, especificações ou customizações deste produto..."
                />
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valor Total:</span>
                  <span className="text-lg font-bold text-primary">
                    R$ {dealProduct.totalValue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Total Geral */}
          <div className="rounded-lg border-2 border-primary bg-purple-50 p-4">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-700">
                Valor Total do Deal:
              </span>
              <span className="text-2xl font-bold text-primary">
                R$ {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
