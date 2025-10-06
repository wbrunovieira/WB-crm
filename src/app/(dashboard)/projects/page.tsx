"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/external-api/projects";
import Link from "next/link";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const PROJECTS_API_URL =
          process.env.NEXT_PUBLIC_PROJECTS_API_URL ||
          "http://localhost:3000/api/projects";

        const response = await fetch(PROJECTS_API_URL, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Falha ao buscar projetos");
        }

        const data: Project[] = await response.json();
        setProjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar projetos");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      PLANNED: "bg-yellow-100 text-yellow-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELED: "bg-red-100 text-red-800",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      PLANNED: "Planejado",
      IN_PROGRESS: "Em Andamento",
      COMPLETED: "Concluído",
      CANCELED: "Cancelado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getTypeLabel = (type: string) => {
    return type === "DEVELOPMENT" ? "Desenvolvimento" : "Manutenção";
  };

  // Group projects by workspace
  const projectsByWorkspace = projects.reduce((acc, project) => {
    const workspaceId = project.workspace.id;
    if (!acc[workspaceId]) {
      acc[workspaceId] = {
        workspace: project.workspace,
        projects: [],
      };
    }
    acc[workspaceId].projects.push(project);
    return acc;
  }, {} as Record<string, { workspace: Project["workspace"]; projects: Project[] }>);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="mt-2 text-gray-600">
            Todos os projetos do sistema de gerenciamento
          </p>
        </div>
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-500">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="mt-2 text-gray-600">
            Todos os projetos do sistema de gerenciamento
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-6 shadow">
          <p className="text-sm text-red-800">{error}</p>
          <p className="mt-2 text-xs text-red-600">
            Certifique-se de que a API de projetos está rodando em{" "}
            {process.env.NEXT_PUBLIC_PROJECTS_API_URL || "http://localhost:3000"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Projetos</h1>
        <p className="mt-2 text-gray-600">
          Total de {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum projeto encontrado
          </h3>
          <p className="mt-2 text-gray-500">
            Ganhe negócios no CRM para criar projetos automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(projectsByWorkspace).map(({ workspace, projects }) => (
            <div key={workspace.id} className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {workspace.name}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({projects.length} {projects.length === 1 ? "projeto" : "projetos"})
                  </span>
                </h2>
                <p className="text-sm text-gray-500">Workspace: {workspace.slug}</p>
              </div>

              <div className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <div key={project.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-medium text-gray-900">
                            {project.name}
                          </h3>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(project.status)}`}
                          >
                            {getStatusLabel(project.status)}
                          </span>
                          <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                            {getTypeLabel(project.type)}
                          </span>
                        </div>

                        {project.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {project.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          {project.startDate && (
                            <span>
                              Início:{" "}
                              {new Date(project.startDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {project.targetDate && (
                            <span>
                              Previsão:{" "}
                              {new Date(project.targetDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {project._count && (
                            <span>
                              {project._count.issues}{" "}
                              {project._count.issues === 1 ? "issue" : "issues"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
