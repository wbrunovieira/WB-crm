"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getActiveTechCategories } from "@/actions/tech-categories";
import { getActiveTechLanguages } from "@/actions/tech-languages";
import { getActiveTechFrameworks } from "@/actions/tech-frameworks";
import {
  addCategoryToDeal,
  addLanguageToDeal,
  addFrameworkToDeal,
} from "@/actions/deal-tech-stack";

interface AddTechStackToDealModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TechCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

interface TechLanguage {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

interface TechFramework {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

type TabType = "categories" | "languages" | "frameworks";

export function AddTechStackToDealModal({
  dealId,
  isOpen,
  onClose,
  onSuccess,
}: AddTechStackToDealModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("categories");
  const [categories, setCategories] = useState<TechCategory[]>([]);
  const [languages, setLanguages] = useState<TechLanguage[]>([]);
  const [frameworks, setFrameworks] = useState<TechFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesData, languagesData, frameworksData] = await Promise.all([
        getActiveTechCategories(),
        getActiveTechLanguages(),
        getActiveTechFrameworks(),
      ]);
      setCategories(categoriesData);
      setLanguages(languagesData);
      setFrameworks(frameworksData);
    } catch (error) {
      console.error("Erro ao carregar tech stack:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (categoryId: string) => {
    setAdding(categoryId);
    try {
      await addCategoryToDeal(dealId, categoryId);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao adicionar categoria";
      alert(message);
    } finally {
      setAdding(null);
    }
  };

  const handleAddLanguage = async (languageId: string, isPrimary: boolean = false) => {
    setAdding(languageId);
    try {
      await addLanguageToDeal(dealId, languageId, isPrimary);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao adicionar linguagem";
      alert(message);
    } finally {
      setAdding(null);
    }
  };

  const handleAddFramework = async (frameworkId: string) => {
    setAdding(frameworkId);
    try {
      await addFrameworkToDeal(dealId, frameworkId);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao adicionar framework";
      alert(message);
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Adicionar Tech Stack
        </h2>

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
              Categorias
            </button>
            <button
              onClick={() => setActiveTab("languages")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "languages"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Linguagens
            </button>
            <button
              onClick={() => setActiveTab("frameworks")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "frameworks"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Frameworks
            </button>
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {activeTab === "categories" && (
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">
                    Nenhuma categoria disponível
                  </p>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {category.color && (
                          <span
                            className="inline-block h-4 w-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category.icon && <span>{category.icon}</span>}
                        <span className="font-medium text-gray-900">
                          {category.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddCategory(category.id)}
                        disabled={adding === category.id}
                        className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        {adding === category.id ? "Adicionando..." : "Adicionar"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "languages" && (
              <div className="space-y-2">
                {languages.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">
                    Nenhuma linguagem disponível
                  </p>
                ) : (
                  languages.map((language) => (
                    <div
                      key={language.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {language.color && (
                          <span
                            className="inline-block h-4 w-4 rounded"
                            style={{ backgroundColor: language.color }}
                          />
                        )}
                        {language.icon && <span>{language.icon}</span>}
                        <span className="font-medium text-gray-900">
                          {language.name}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddLanguage(language.id, false)}
                          disabled={adding === language.id}
                          className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        >
                          {adding === language.id ? "..." : "Adicionar"}
                        </button>
                        <button
                          onClick={() => handleAddLanguage(language.id, true)}
                          disabled={adding === language.id}
                          className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                        >
                          {adding === language.id ? "..." : "Principal"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "frameworks" && (
              <div className="space-y-2">
                {frameworks.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">
                    Nenhum framework disponível
                  </p>
                ) : (
                  frameworks.map((framework) => (
                    <div
                      key={framework.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {framework.color && (
                          <span
                            className="inline-block h-4 w-4 rounded"
                            style={{ backgroundColor: framework.color }}
                          />
                        )}
                        {framework.icon && <span>{framework.icon}</span>}
                        <span className="font-medium text-gray-900">
                          {framework.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddFramework(framework.id)}
                        disabled={adding === framework.id}
                        className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        {adding === framework.id ? "Adicionando..." : "Adicionar"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
