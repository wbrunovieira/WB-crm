"use client";

import { useState, useMemo } from "react";
import { TechCategoryForm } from "./TechCategoryForm";
import { TechCategoriesList } from "./TechCategoriesList";
import { TechLanguageForm } from "./TechLanguageForm";
import { TechLanguagesList } from "./TechLanguagesList";
import { TechFrameworkForm } from "./TechFrameworkForm";
import { TechFrameworksList } from "./TechFrameworksList";
import { useTechOptions } from "@/hooks/admin/use-admin";

type Tab = "categories" | "languages" | "frameworks";

export function TechStackManager() {
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  const { data: categories = [] } = useTechOptions("tech-category");
  const { data: languages = [] } = useTechOptions("tech-language");
  const { data: frameworks = [] } = useTechOptions("tech-framework");

  // Extract used orders from categories
  const usedCategoryOrders = useMemo(() => {
    return categories.map((c) => c.order ?? 0);
  }, [categories]);

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("categories")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "categories"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Categorias ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("languages")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "languages"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Linguagens ({languages.length})
          </button>
          <button
            onClick={() => setActiveTab("frameworks")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "frameworks"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Frameworks ({frameworks.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Nova Categoria</h2>
              <TechCategoryForm usedOrders={usedCategoryOrders} />
            </div>
          </div>
          <div className="lg:col-span-2">
            <TechCategoriesList />
          </div>
        </div>
      )}

      {activeTab === "languages" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Nova Linguagem</h2>
              <TechLanguageForm />
            </div>
          </div>
          <div className="lg:col-span-2">
            <TechLanguagesList />
          </div>
        </div>
      )}

      {activeTab === "frameworks" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Novo Framework</h2>
              <TechFrameworkForm />
            </div>
          </div>
          <div className="lg:col-span-2">
            <TechFrameworksList />
          </div>
        </div>
      )}
    </div>
  );
}
