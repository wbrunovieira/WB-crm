import { getProducts, getUsedProductOrders } from "@/actions/products";
import { getBusinessLines } from "@/actions/business-lines";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductsList } from "@/components/admin/ProductsList";
import Link from "next/link";

export default async function ProductsPage() {
  const [products, businessLines, usedOrders] = await Promise.all([
    getProducts(),
    getBusinessLines(),
    getUsedProductOrders(),
  ]);

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="mt-2 text-gray-600">
            Gerencie os produtos e serviços oferecidos
          </p>
        </div>
        <Link
          href="/admin/business-lines"
          className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
        >
          Gerenciar Linhas de Negócio
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Formulário de Criação */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Novo Produto</h2>
            <ProductForm businessLines={businessLines} usedOrders={usedOrders} />
          </div>
        </div>

        {/* Lista de Products */}
        <div className="lg:col-span-2">
          <ProductsList products={products} />
        </div>
      </div>
    </div>
  );
}
