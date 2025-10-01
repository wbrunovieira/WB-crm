"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteActivity } from "@/actions/activities";

export default function DeleteActivityButton({
  activityId,
}: {
  activityId: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta atividade?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteActivity(activityId);
      router.push("/activities");
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao excluir atividade"
      );
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {isDeleting ? "Excluindo..." : "Excluir"}
    </button>
  );
}
