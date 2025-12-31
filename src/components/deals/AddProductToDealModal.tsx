"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { addProductToDeal } from "@/actions/product-links";

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

interface AddProductToDealModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductToDealModal({
  dealId,
  isOpen,
  onClose,
  onSuccess,
}: AddProductToDealModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [description, setDescription] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<number | undefined>();

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products/active");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setError("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product && product.basePrice) {
      setUnitPrice(product.basePrice);
    }
  };

  const calculateTotal = () => {
    return quantity * unitPrice - discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await addProductToDeal({
        dealId,
        productId: selectedProductId,
        quantity,
        unitPrice,
        discount,
        totalValue: calculateTotal(),
        description: description || null,
        deliveryTime: deliveryTime || null,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar produto");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedProductId("");
    setQuantity(1);
    setUnitPrice(0);
    setDiscount(0);
    setDescription("");
    setDeliveryTime(undefined);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Adicionar Produto ao Deal
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando produtos...
            </div>
          ) : (
            <>
              {/* Seleção de Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Selecione um produto...</option>
                  {Object.values(groupedProducts).map((group) => (
                    <optgroup key={group.name} label={group.name}>
                      {group.products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                          {product.basePrice &&
                            ` - R$ ${product.basePrice.toFixed(2)}`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Grid de Preços */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Unitário (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prazo de Entrega (dias)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryTime || ""}
                    onChange={(e) =>
                      setDeliveryTime(
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="Opcional"
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição / Customizações
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalhes, especificações ou customizações deste produto..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              {/* Preview do Total */}
              {selectedProductId && (
                <div className="rounded-lg border-2 border-primary bg-purple-50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">
                      Valor Total:
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(calculateTotal())}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {quantity}x R$ {unitPrice.toFixed(2)}
                    {discount > 0 && ` - R$ ${discount.toFixed(2)} desconto`}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer com botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedProductId || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? "Adicionando..." : "Adicionar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
