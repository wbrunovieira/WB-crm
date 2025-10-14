"use client";

import { useState } from "react";
import { TechCategoryForm } from "./TechCategoryForm";
import { TechCategoriesList } from "./TechCategoriesList";
import { TechLanguageForm } from "./TechLanguageForm";
import { TechLanguagesList } from "./TechLanguagesList";
import { TechFrameworkForm } from "./TechFrameworkForm";
import { TechFrameworksList } from "./TechFrameworksList";

interface TechCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  _count: {
    dealTechStacks: number;
  };
}

interface TechLanguage {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  _count: {
    dealLanguages: number;
  };
}

interface TechFramework {
  id: string;
  name: string;
  slug: string;
  languageSlug: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  _count: {
    dealFrameworks: number;
  };
}

interface TechStackManagerProps {
  categories: TechCategory[];
  languages: TechLanguage[];
  frameworks: TechFramework[];
}

type Tab = "categories" | "languages" | "frameworks";

export function TechStackManager({
  categories,
  languages,
  frameworks,
}: TechStackManagerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("categories");

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
              <TechCategoryForm />
            </div>
          </div>
          <div className="lg:col-span-2">
            <TechCategoriesList categories={categories} />
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
            <TechLanguagesList languages={languages} />
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
            <TechFrameworksList frameworks={frameworks} />
          </div>
        </div>
      )}
    </div>
  );
}
