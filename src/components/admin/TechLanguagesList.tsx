"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  toggleTechLanguageActive,
  deleteTechLanguage,
} from "@/actions/tech-languages";
import { Eye, EyeOff, Trash2 } from "lucide-react";

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

interface TechLanguagesListProps {
  languages: TechLanguage[];
}

export function TechLanguagesList({ languages }: TechLanguagesListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleActive = async (id: string) => {
    setLoading(id);
    try {
      await toggleTechLanguageActive(id);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar linguagem";
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string, dealCount: number) => {
    if (dealCount > 0) {
      alert(
        `Não é possível excluir "${name}" pois possui ${dealCount} deal(s) vinculado(s).`
      );
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) {
      return;
    }

    setLoading(id);
    try {
      await deleteTechLanguage(id);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir linguagem";
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  if (languages.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          Nenhuma linguagem cadastrada
        </h3>
        <p className="mt-2 text-gray-500">
          Crie sua primeira linguagem para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {languages.map((language) => (
        <div
          key={language.id}
          className={`rounded-lg border bg-white p-4 shadow-sm ${
            !language.isActive ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {language.color && (
                  <span
                    className="inline-block h-4 w-4 rounded"
                    style={{ backgroundColor: language.color }}
                  />
                )}
                {language.icon && <span>{language.icon}</span>}
                <h3 className="text-lg font-semibold text-gray-900">
                  {language.name}
                </h3>
                {!language.isActive && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Inativa
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-600">
                <span className="font-mono text-xs text-gray-400">
                  {language.slug}
                </span>
              </p>

              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{language._count.dealLanguages} deal(s)</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleToggleActive(language.id)}
                disabled={loading === language.id}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                title={language.isActive ? "Desativar" : "Ativar"}
              >
                {language.isActive ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() =>
                  handleDelete(
                    language.id,
                    language.name,
                    language._count.dealLanguages
                  )
                }
                disabled={loading === language.id || language._count.dealLanguages > 0}
                className="rounded-md p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                title="Excluir"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
