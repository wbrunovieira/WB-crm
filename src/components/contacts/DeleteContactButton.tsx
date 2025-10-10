"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteContact } from "@/actions/contacts";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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
      className="rounded-md p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
      title="Excluir"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
