"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertLeadToOrganization } from "@/actions/leads";
import { toast } from "sonner";

export function ConvertLeadButton({
  leadId,
  hasContacts,
}: {
  leadId: string;
  hasContacts: boolean;
}) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);

  async function handleConvert() {
    if (!hasContacts) {
      toast.error("Adicione pelo menos um contato antes de converter o lead");
      return;
    }

    toast.warning("Converter este lead em cliente?", {
      description:
        "O lead será convertido em organização e os contatos serão criados automaticamente.",
      action: {
        label: "Confirmar",
        onClick: async () => {
          setIsConverting(true);
          try {
            const result = await convertLeadToOrganization(leadId);
            toast.success("Lead convertido com sucesso!", {
              description: `Organização ${result.organization.name} e ${result.contacts.length} contato(s) criados.`,
            });
            router.push(`/organizations/${result.organization.id}`);
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Erro ao converter lead"
            );
            setIsConverting(false);
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
      onClick={handleConvert}
      disabled={isConverting || !hasContacts}
      className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
      title={
        !hasContacts
          ? "Adicione contatos antes de converter"
          : "Converter em cliente"
      }
    >
      {isConverting ? "Convertendo..." : "🎯 Converter em Cliente"}
    </button>
  );
}
