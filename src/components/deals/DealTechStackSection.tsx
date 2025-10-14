"use client";

import { useState, useEffect } from "react";
import { getDealTechStack, removeCategoryFromDeal, removeLanguageFromDeal, removeFrameworkFromDeal, setPrimaryLanguage } from "@/actions/deal-tech-stack";
import { X, Code, Plus, Star } from "lucide-react";
import { AddTechStackToDealModal } from "./AddTechStackToDealModal";

interface DealTechStackSectionProps {
  dealId: string;
}

interface TechCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  description: string | null;
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

interface DealTechStackData {
  categories: {
    id: string;
    techCategory: TechCategory;
  }[];
  languages: {
    id: string;
    isPrimary: boolean;
    language: TechLanguage;
  }[];
  frameworks: {
    id: string;
    framework: TechFramework;
  }[];
}

export function DealTechStackSection({ dealId }: DealTechStackSectionProps) {
  const [techStack, setTechStack] = useState<DealTechStackData>({
    categories: [],
    languages: [],
    frameworks: [],
  });
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTechStack();
  }, [dealId]);

  const loadTechStack = async () => {
    try {
      const data = await getDealTechStack(dealId);
      setTechStack(data);
    } catch (error) {
      console.error("Erro ao carregar tech stack:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Remover categoria "${categoryName}"?`)) return;

    setRemoving(categoryId);
    try {
      await removeCategoryFromDeal(dealId, categoryId);
      await loadTechStack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover categoria";
      alert(message);
    } finally {
      setRemoving(null);
    }
  };

  const handleRemoveLanguage = async (languageId: string, languageName: string) => {
    if (!confirm(`Remover linguagem "${languageName}"?`)) return;

    setRemoving(languageId);
    try {
      await removeLanguageFromDeal(dealId, languageId);
      await loadTechStack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover linguagem";
      alert(message);
    } finally {
      setRemoving(null);
    }
  };

  const handleRemoveFramework = async (frameworkId: string, frameworkName: string) => {
    if (!confirm(`Remover framework "${frameworkName}"?`)) return;

    setRemoving(frameworkId);
    try {
      await removeFrameworkFromDeal(dealId, frameworkId);
      await loadTechStack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover framework";
      alert(message);
    } finally {
      setRemoving(null);
    }
  };

  const handleSetPrimary = async (languageId: string) => {
    setRemoving(languageId);
    try {
      await setPrimaryLanguage(dealId, languageId);
      await loadTechStack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao definir linguagem principal";
      alert(message);
    } finally {
      setRemoving(null);
    }
  };

  const hasAnyTechStack = techStack.categories.length > 0 || techStack.languages.length > 0 || techStack.frameworks.length > 0;

  if (loading) {
    return (
      <>
        <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Code className="h-6 w-6 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900">Tech Stack</h2>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Adicionar Tech Stack
            </button>
          </div>
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
        <AddTechStackToDealModal
          dealId={dealId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadTechStack}
        />
      </>
    );
  }

  if (!hasAnyTechStack) {
    return (
      <>
        <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Code className="h-6 w-6 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900">Tech Stack</h2>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Adicionar Tech Stack
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Nenhuma tecnologia vinculada a este deal.
          </p>
        </div>
        <AddTechStackToDealModal
          dealId={dealId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadTechStack}
        />
      </>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💻</span>
            <h2 className="text-xl font-bold text-gray-900">Tech Stack</h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar Tech Stack
          </button>
        </div>

        <div className="space-y-6">
          {/* Categories */}
          {techStack.categories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Categorias
              </h3>
              <div className="flex flex-wrap gap-2">
                {techStack.categories.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    {item.techCategory.color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.techCategory.color }}
                      />
                    )}
                    {item.techCategory.icon && (
                      <span>{item.techCategory.icon}</span>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {item.techCategory.name}
                    </span>
                    <button
                      onClick={() => handleRemoveCategory(item.techCategory.id, item.techCategory.name)}
                      disabled={removing === item.techCategory.id}
                      className="ml-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Remover categoria"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {techStack.languages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Linguagens
              </h3>
              <div className="flex flex-wrap gap-2">
                {techStack.languages.map((item) => (
                  <div
                    key={item.id}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${
                      item.isPrimary
                        ? "border-primary bg-purple-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {item.language.color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.language.color }}
                      />
                    )}
                    {item.language.icon && <span>{item.language.icon}</span>}
                    <span
                      className={`text-sm font-medium ${
                        item.isPrimary ? "text-primary" : "text-gray-900"
                      }`}
                    >
                      {item.language.name}
                    </span>
                    {item.isPrimary && (
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    )}
                    {!item.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(item.language.id)}
                        disabled={removing === item.language.id}
                        className="ml-1 text-gray-400 hover:text-primary disabled:opacity-50"
                        title="Definir como principal"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveLanguage(item.language.id, item.language.name)}
                      disabled={removing === item.language.id}
                      className="ml-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Remover linguagem"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frameworks */}
          {techStack.frameworks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Frameworks
              </h3>
              <div className="flex flex-wrap gap-2">
                {techStack.frameworks.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    {item.framework.color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.framework.color }}
                      />
                    )}
                    {item.framework.icon && <span>{item.framework.icon}</span>}
                    <span className="text-sm font-medium text-gray-900">
                      {item.framework.name}
                    </span>
                    <button
                      onClick={() => handleRemoveFramework(item.framework.id, item.framework.name)}
                      disabled={removing === item.framework.id}
                      className="ml-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Remover framework"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddTechStackToDealModal
        dealId={dealId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadTechStack}
      />
    </>
  );
}
