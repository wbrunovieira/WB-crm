"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/external-api/projects";

type OrganizationProjectsProps = {
  projectIds: string[];
  organizationId: string;
};

export function OrganizationProjects({
  projectIds,
  organizationId,
}: OrganizationProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectIds || projectIds.length === 0) {
      setLoading(false);
      return;
    }

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

        const allProjects: Project[] = await response.json();
        const filteredProjects = allProjects.filter((p) =>
          projectIds.includes(p.id)
        );
        setProjects(filteredProjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar projetos");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [projectIds]);

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

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 border-b border-gray-200 pb-3">
          <h2 className="text-lg font-bold text-gray-900">Projetos</h2>
        </div>
        <p className="text-sm text-gray-500">Carregando projetos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 border-b border-gray-200 pb-3">
          <h2 className="text-lg font-bold text-gray-900">Projetos</h2>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const inProgressProjects = projects.filter((p) => p.status === "IN_PROGRESS");
  const completedProjects = projects.filter((p) => p.status === "COMPLETED");

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900">
          Projetos ({projects.length})
        </h2>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">Nenhum projeto vinculado. Ganhe um negócio para criar um projeto.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inProgressProjects.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Em Andamento ({inProgressProjects.length})
              </h3>
              <ul className="space-y-2">
                {inProgressProjects.map((project) => (
                  <li key={project.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-100 hover:text-purple-200">
                        {project.name}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(project.status)}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {project.type === "DEVELOPMENT" ? "Desenvolvimento" : "Manutenção"}
                      </span>
                    </div>
                    {project.description && (
                      <p className="mt-1 text-xs text-gray-400">
                        {project.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {completedProjects.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Concluídos ({completedProjects.length})
              </h3>
              <ul className="space-y-2">
                {completedProjects.map((project) => (
                  <li key={project.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-100 hover:text-purple-200">
                        {project.name}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(project.status)}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {project.type === "DEVELOPMENT" ? "Desenvolvimento" : "Manutenção"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
