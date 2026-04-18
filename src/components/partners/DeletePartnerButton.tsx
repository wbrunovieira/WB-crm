"use client";

import { useRouter } from "next/navigation";
import { useDeletePartner } from "@/hooks/partners/use-partners";
import { toast } from "sonner";

export function DeletePartnerButton({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const deleteMutation = useDeletePartner();

  function handleDelete() {
    toast.warning("Tem certeza que deseja excluir este parceiro?", {
      action: {
        label: "Confirmar",
        onClick: async () => {
          try {
            await deleteMutation.mutateAsync(partnerId);
            toast.success("Parceiro excluído com sucesso!");
            router.push("/partners");
            router.refresh();
          } catch {
            toast.error("Erro ao excluir parceiro");
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
      disabled={deleteMutation.isPending}
      className="rounded-md border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
