"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDeal } from "@/actions/deals";
import { toast } from "sonner";
import { ConfirmDialog, useConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function DeleteDealButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Confirmar",
      message: "Tem certeza que deseja excluir este negócio?",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteDeal(dealId);
      router.push("/deals");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir negócio"
      );
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {isDeleting ? "Excluindo..." : "Excluir"}
      </button>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}
