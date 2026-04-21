"use client";

import { useState } from "react";
import {
  useDealTechStack,
  useRemoveCategoryFromDeal,
  useRemoveLanguageFromDeal,
  useRemoveFrameworkFromDeal,
  useSetPrimaryLanguage,
} from "@/hooks/deals/use-deal-tech-stack";
import { X, Code, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog, useConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AddTechStackToDealModal } from "./AddTechStackToDealModal";

interface DealTechStackSectionProps {
  dealId: string;
}

export function DealTechStackSection({ dealId }: DealTechStackSectionProps) {
  const { data: techStack, isLoading: loading } = useDealTechStack(dealId);
  const removeCategoryMutation = useRemoveCategoryFromDeal();
  const removeLanguageMutation = useRemoveLanguageFromDeal();
  const removeFrameworkMutation = useRemoveFrameworkFromDeal();
  const setPrimaryMutation = useSetPrimaryLanguage();

  const [removing, setRemoving] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  const categories = techStack?.categories ?? [];
  const languages = techStack?.languages ?? [];
  const frameworks = techStack?.frameworks ?? [];

  const handleRemoveCategory = async (categoryId: string, categoryName: string) => {
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Remover categoria "${categoryName}"?`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!confirmed) return;

    setRemoving(categoryId);
    try {
      await removeCategoryMutation.mutateAsync({ dealId, categoryId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover categoria";
      toast.error(message);
    } finally {
      setRemoving(null);
    }
  };

  const handleRemoveLanguage = async (languageId: string, languageName: string) => {
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Remover linguagem "${languageName}"?`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!confirmed) return;

    setRemoving(languageId);
    try {
      await removeLanguageMutation.mutateAsync({ dealId, languageId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover linguagem";
      toast.error(message);
    } finally {
      setRemoving(null);
    }
  };

  const handleRemoveFramework = async (frameworkId: string, frameworkName: string) => {
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Remover framework "${frameworkName}"?`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!confirmed) return;

    setRemoving(frameworkId);
    try {
      await removeFrameworkMutation.mutateAsync({ dealId, frameworkId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover framework";
      toast.error(message);
    } finally {
      setRemoving(null);
    }
  };

  const handleSetPrimary = async (languageId: string) => {
    setRemoving(languageId);
    try {
      await setPrimaryMutation.mutateAsync({ dealId, languageId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao definir linguagem principal";
      toast.error(message);
    } finally {
      setRemoving(null);
    }
  };

  const hasAnyTechStack = categories.length > 0 || languages.length > 0 || frameworks.length > 0;

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
        />
        <ConfirmDialog {...dialogProps} />
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
        />
        <ConfirmDialog {...dialogProps} />
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
          {categories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Categorias
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {item.categoryName}
                    </span>
                    <button
                      onClick={() => handleRemoveCategory(item.categoryId, item.categoryName)}
                      disabled={removing === item.categoryId}
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
          {languages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Linguagens
              </h3>
              <div className="flex flex-wrap gap-2">
                {languages.map((item) => (
                  <div
                    key={item.id}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${
                      item.isPrimary
                        ? "border-primary bg-purple-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        item.isPrimary ? "text-primary" : "text-gray-900"
                      }`}
                    >
                      {item.languageName}
                    </span>
                    {item.isPrimary && (
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    )}
                    {!item.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(item.languageId)}
                        disabled={removing === item.languageId}
                        className="ml-1 text-gray-400 hover:text-primary disabled:opacity-50"
                        title="Definir como principal"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveLanguage(item.languageId, item.languageName)}
                      disabled={removing === item.languageId}
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
          {frameworks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Frameworks
              </h3>
              <div className="flex flex-wrap gap-2">
                {frameworks.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {item.frameworkName}
                    </span>
                    <button
                      onClick={() => handleRemoveFramework(item.frameworkId, item.frameworkName)}
                      disabled={removing === item.frameworkId}
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
      />
      <ConfirmDialog {...dialogProps} />
    </>
  );
}
