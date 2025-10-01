"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteContact } from "@/actions/contacts";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este contato?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteContact(contactId);
      router.push("/contacts");
      router.refresh();
    } catch {
      alert("Erro ao excluir contato");
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
