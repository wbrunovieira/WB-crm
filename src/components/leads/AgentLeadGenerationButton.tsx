"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { AgentLeadGenerationModal } from "./AgentLeadGenerationModal";

type ICP = {
  id: string;
  name: string;
  content: string;
  status: string;
  _count?: {
    leads: number;
    organizations: number;
  };
};

type AgentLeadGenerationButtonProps = {
  icps: ICP[];
};

export function AgentLeadGenerationButton({ icps }: AgentLeadGenerationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 rounded-md border border-purple-300 bg-purple-50 px-4 py-2 text-purple-700 hover:bg-purple-100"
      >
        <Bot className="h-4 w-4" />
        Criar Leads por Agente
      </button>

      {isModalOpen && (
        <AgentLeadGenerationModal
          icps={icps}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
