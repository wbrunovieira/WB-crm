"use client";

import Link from "next/link";
import { Package, Briefcase, Code } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="mt-2 text-gray-600">
          Gerencie as configurações do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Business Lines Card */}
        <Link
          href="/admin/business-lines"
          className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:border-primary"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-3 group-hover:bg-primary group-hover:text-white transition-colors">
              <Briefcase className="h-6 w-6 text-primary group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary">
                Linhas de Negócio
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie as frentes de negócio da empresa
              </p>
            </div>
          </div>
        </Link>

        {/* Products Card */}
        <Link
          href="/admin/products"
          className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:border-primary"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-3 group-hover:bg-primary group-hover:text-white transition-colors">
              <Package className="h-6 w-6 text-primary group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary">
                Produtos
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie o catálogo de produtos e serviços
              </p>
            </div>
          </div>
        </Link>

        {/* Tech Stack Card */}
        <Link
          href="/admin/tech-stack"
          className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:border-primary"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-3 group-hover:bg-primary group-hover:text-white transition-colors">
              <Code className="h-6 w-6 text-primary group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary">
                Tech Stack
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie categorias, linguagens e frameworks
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
