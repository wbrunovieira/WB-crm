"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DealsListView } from "./DealsListView";
import { DealsKanbanView } from "./DealsKanbanView";
import { DealsFilters } from "./DealsFilters";

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  expectedCloseDate: Date | null;
  contact: { id: string; name: string } | null;
  organization: { id: string; name: string } | null;
  stage: {
    id: string;
    name: string;
    pipeline: { id: string; name: string };
  };
  createdAt: Date;
}

interface PipelineData {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    deals: Deal[];
  }>;
}

interface DealsViewProps {
  initialView: "list" | "kanban";
  deals?: Deal[];
  pipelineData?: PipelineData;
  allPipelines?: Array<{ id: string; name: string }>;
  groupBy: string;
  displayMode?: string;
}

export function DealsView({
  initialView,
  deals = [],
  pipelineData,
  allPipelines = [],
  groupBy,
  displayMode = "table",
}: DealsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentGroupBy, setCurrentGroupBy] = useState(groupBy);

  const handleViewChange = (newView: "list" | "kanban") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`/deals?${params.toString()}`);
  };

  const handleGroupByChange = (newGroupBy: string) => {
    setCurrentGroupBy(newGroupBy);
    const params = new URLSearchParams(searchParams.toString());
    params.set("groupBy", newGroupBy);
    router.push(`/deals?${params.toString()}`);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Negócios</h1>
            <p className="mt-2 text-gray-600">
              Gerencie seus negócios e oportunidades
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-300 bg-gray-50 p-1">
              <button
                onClick={() => handleViewChange("list")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  initialView === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📋 Lista
              </button>
              <button
                onClick={() => handleViewChange("kanban")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  initialView === "kanban"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📊 Kanban
              </button>
            </div>

            {/* Group By (only for list view) */}
            {initialView === "list" && (
              <select
                value={currentGroupBy}
                onChange={(e) => handleGroupByChange(e.target.value)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="none">Sem agrupamento</option>
                <option value="stage">Agrupar por Estágio</option>
                <option value="value">Agrupar por Valor</option>
                <option value="status">Agrupar por Status</option>
              </select>
            )}

            <Link
              href="/deals/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              + Novo Negócio
            </Link>
          </div>
        </div>

        {/* Filters (only for list view) */}
        {initialView === "list" && <DealsFilters />}
      </div>

      <div className="flex-1 overflow-auto p-8">
        {initialView === "list" ? (
          <DealsListView deals={deals} groupBy={currentGroupBy} displayMode={displayMode} />
        ) : pipelineData ? (
          <DealsKanbanView
            pipelineData={pipelineData}
            allPipelines={allPipelines}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Carregando...
          </div>
        )}
      </div>
    </div>
  );
}
