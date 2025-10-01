"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrganization } from "@/actions/organizations";

export function DeleteOrganizationButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta organização?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOrganization(organizationId);
      router.push("/organizations");
      router.refresh();
    } catch {
      alert("Erro ao excluir organização");
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
    >
      {isDeleting ? "Excluindo..." : "Excluir"}
    </button>
  );
}
