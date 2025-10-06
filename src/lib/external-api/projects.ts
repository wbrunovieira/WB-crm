// External Project Management API Integration

const PROJECTS_API_BASE_URL = process.env.NEXT_PUBLIC_PROJECTS_API_URL || "http://localhost:3000/api/projects";

export type ProjectType = "DEVELOPMENT" | "MAINTENANCE";
export type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export interface CreateProjectDTO {
  name: string;
  description?: string;
  workspaceId: string;
  type?: ProjectType;
  status?: ProjectStatus;
  startDate?: string;
  targetDate?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  type: ProjectType;
  status: ProjectStatus;
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    issues: number;
  };
}

export async function createExternalProject(data: CreateProjectDTO): Promise<Project> {
  const response = await fetch(PROJECTS_API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create project" }));
    throw new Error(error.error || "Failed to create project");
  }

  return response.json();
}

export async function listExternalProjects(workspaceId?: string, status?: ProjectStatus): Promise<Project[]> {
  const params = new URLSearchParams();
  if (workspaceId) params.append("workspaceId", workspaceId);
  if (status) params.append("status", status);

  const url = params.toString() ? `${PROJECTS_API_BASE_URL}?${params}` : PROJECTS_API_BASE_URL;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch projects" }));
    throw new Error(error.error || "Failed to fetch projects");
  }

  return response.json();
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const WORKSPACES_API_URL = PROJECTS_API_BASE_URL.replace("/api/projects", "/api/workspaces");

  const response = await fetch(WORKSPACES_API_URL, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch workspaces" }));
    throw new Error(error.error || "Failed to fetch workspaces");
  }

  return response.json();
}
