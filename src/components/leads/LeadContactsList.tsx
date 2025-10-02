"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteLeadContact } from "@/actions/leads";
import { useRouter } from "next/navigation";
import { AddLeadContactModal } from "./AddLeadContactModal";

type LeadContact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
};

export function LeadContactsList({
  leadId,
  leadContacts,
  isConverted,
}: {
  leadId: string;
  leadContacts: LeadContact[];
  isConverted: boolean;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(contactId: string) {
    if (isConverted) {
      toast.error("Não é possível excluir contatos de lead já convertido");
      return;
    }

    toast.warning("Tem certeza que deseja excluir este contato?", {
      action: {
        label: "Confirmar",
        onClick: async () => {
          setDeletingId(contactId);
          try {
            await deleteLeadContact(contactId);
            toast.success("Contato excluído com sucesso!");
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Erro ao excluir contato"
            );
          } finally {
            setDeletingId(null);
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
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Contatos ({leadContacts.length})
        </h2>
        {!isConverted && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm text-primary hover:text-purple-700"
          >
            + Adicionar Contato
          </button>
        )}
      </div>

      {leadContacts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Nenhum contato adicionado ainda.
          </p>
          {!isConverted && (
            <p className="mt-2 text-xs text-gray-400">
              Adicione pelo menos um contato para poder converter o lead.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {leadContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between rounded-lg border border-gray-200 p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{contact.name}</h3>
                  {contact.isPrimary && (
                    <span className="inline-flex rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
                      Principal
                    </span>
                  )}
                </div>
                {contact.role && (
                  <p className="text-sm text-gray-500">{contact.role}</p>
                )}
                <div className="mt-2 space-y-1">
                  {contact.email && (
                    <p className="text-sm text-gray-600">
                      📧 {contact.email}
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-gray-600">
                      📞 {contact.phone}
                    </p>
                  )}
                  {contact.whatsapp && (
                    <p className="text-sm text-gray-600">
                      💬 {contact.whatsapp}
                    </p>
                  )}
                </div>
              </div>
              {!isConverted && (
                <button
                  onClick={() => handleDelete(contact.id)}
                  disabled={deletingId === contact.id}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  title="Excluir contato"
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
              )}
            </div>
          ))}
        </div>
      )}

      <AddLeadContactModal
        leadId={leadId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
