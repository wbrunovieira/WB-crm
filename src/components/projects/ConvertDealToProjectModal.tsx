"use client";

import { useState, useEffect } from "react";
import { createExternalProject, ProjectType, listWorkspaces, Workspace } from "@/lib/external-api/projects";
import { linkProjectToOrganization } from "@/actions/external-projects";
import { useRouter } from "next/navigation";

type ConvertDealToProjectModalProps = {
  dealId: string;
  dealTitle: string;
  dealValue: number;
  organizationId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function ConvertDealToProjectModal({
  dealId,
  dealTitle,
  dealValue,
  organizationId,
  isOpen,
  onClose,
}: ConvertDealToProjectModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(dealTitle);
  const [projectDescription, setProjectDescription] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("DEVELOPMENT");
  const [workspaceId, setWorkspaceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingWorkspaces(true);
      listWorkspaces()
        .then((data) => {
          setWorkspaces(data);
          // Auto-select first workspace if available
          if (data.length > 0 && !workspaceId) {
            setWorkspaceId(data[0].id);
          }
        })
        .catch((err) => {
          console.error("Erro ao buscar workspaces:", err);
          setError("Não foi possível carregar os workspaces");
        })
        .finally(() => {
          setLoadingWorkspaces(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const project = await createExternalProject({
        name: projectName,
        description: projectDescription || undefined,
        workspaceId: workspaceId,
        type: projectType,
        status: "IN_PROGRESS",
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
      });

      // Vincular projeto à organização se existir
      if (organizationId && project.id) {
        await linkProjectToOrganization(organizationId, project.id);
      }

      if (organizationId) {
        router.push(`/organizations/${organizationId}`);
      } else {
        router.push(`/deals`);
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar projeto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Negócio Ganho! 🎉
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Crie um projeto no sistema de gerenciamento de projetos a partir deste negócio.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="projectName"
              className="block text-sm font-medium text-gray-700"
            >
              Nome do Projeto *
            </label>
            <input
              type="text"
              id="projectName"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="projectDescription"
              className="block text-sm font-medium text-gray-700"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="projectDescription"
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Descreva o escopo e objetivos do projeto..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              Valor do negócio: R$ {dealValue.toLocaleString("pt-BR")}
            </p>
          </div>

          <div>
            <label
              htmlFor="projectType"
              className="block text-sm font-medium text-gray-700"
            >
              Tipo de Projeto *
            </label>
            <select
              id="projectType"
              required
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as ProjectType)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
            >
              <option value="DEVELOPMENT">Desenvolvimento</option>
              <option value="MAINTENANCE">Manutenção</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {projectType === "DEVELOPMENT"
                ? "Para novos sistemas, features e projetos com milestones"
                : "Para contratos de manutenção, correções e suporte com SLA"}
            </p>
          </div>

          <div>
            <label
              htmlFor="workspaceId"
              className="block text-sm font-medium text-gray-700"
            >
              Workspace *
            </label>
            {loadingWorkspaces ? (
              <div className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500">
                Carregando workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="mt-1">
                <div className="block w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
                  Nenhum workspace disponível
                </div>
                <p className="mt-1 text-xs text-red-500">
                  Você precisa ter acesso a pelo menos um workspace para criar projetos
                </p>
              </div>
            ) : (
              <select
                id="workspaceId"
                required
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
              >
                <option value="">Selecione um workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Selecione o workspace onde o projeto será criado
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700"
              >
                Data de Início
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="targetDate"
                className="block text-sm font-medium text-gray-700"
              >
                Data Prevista de Conclusão
              </label>
              <input
                type="date"
                id="targetDate"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Agora não
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Criando..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
