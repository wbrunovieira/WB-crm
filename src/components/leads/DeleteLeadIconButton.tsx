"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLead } from "@/actions/leads";
import { toast } from "sonner";

export function DeleteLeadIconButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    toast.warning("Tem certeza que deseja excluir este lead?", {
      description: "Esta ação não pode ser desfeita.",
      action: {
        label: "Confirmar",
        onClick: async () => {
          setIsDeleting(true);
          try {
            await deleteLead(leadId);
            toast.success("Lead excluído com sucesso!");
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Erro ao excluir lead"
            );
            setIsDeleting(false);
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-gray-600 hover:text-red-600 disabled:opacity-50"
      title="Excluir"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
