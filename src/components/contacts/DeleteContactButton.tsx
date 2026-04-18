"use client";

import { useRouter } from "next/navigation";
import { useDeleteContact } from "@/hooks/contacts/use-contacts";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const deleteMutation = useDeleteContact();

  async function handleDelete() {
    toast.promise(
      deleteMutation.mutateAsync(contactId).then(() => router.push("/contacts")),
      {
        loading: "Excluindo contato...",
        success: "Contato excluído com sucesso!",
        error: (error) => error instanceof Error ? error.message : "Erro ao excluir contato",
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
      disabled={deleteMutation.isPending}
      className="rounded-md p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
      title="Excluir"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
