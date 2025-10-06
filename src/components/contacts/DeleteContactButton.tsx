"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteContact } from "@/actions/contacts";
import { toast } from "sonner";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    toast.promise(
      async () => {
        setIsDeleting(true);
        await deleteContact(contactId);
        router.refresh();
      },
      {
        loading: "Excluindo contato...",
        success: "Contato excluído com sucesso!",
        error: (error) => {
          setIsDeleting(false);
          return error instanceof Error ? error.message : "Erro ao excluir contato";
        },
      }
    );
  }

  function confirmDelete() {
    toast("Tem certeza que deseja excluir este contato?", {
      description: "Esta ação não pode ser desfeita.",
      action: {
        label: "Excluir",
        onClick: handleDelete,
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
  }

  return (
    <button
      onClick={confirmDelete}
      disabled={isDeleting}
      className="text-gray-600 hover:text-red-600 disabled:opacity-50"
      title="Excluir"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
