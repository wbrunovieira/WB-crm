"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toggleContactStatus } from "@/actions/contacts";
import { UserX, UserCheck, Loader2 } from "lucide-react";
import { LanguageBadges } from "@/components/shared/LanguageSelector";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  languages: string | null;
};

export function OrganizationContactsList({
  organizationId,
  contacts,
}: {
  organizationId: string;
  contacts: Contact[];
}) {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggle(contactId: string, currentStatus: string) {
    setTogglingId(contactId);
    try {
      await toggleContactStatus(contactId);
      toast.success(currentStatus === "active" ? "Contato desativado" : "Contato reativado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar status");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900">
          Contatos ({contacts.length})
        </h2>
        <Link
          href={`/contacts/new?organizationId=${organizationId}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          + Novo Contato
        </Link>
      </div>
      {contacts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">Nenhum contato vinculado</p>
          <Link
            href={`/contacts/new?organizationId=${organizationId}`}
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Criar Primeiro Contato
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact) => {
            const isActive = contact.status === "active";
            return (
              <li
                key={contact.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  isActive ? "" : "opacity-50 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className={`font-medium hover:underline ${
                      isActive
                        ? "text-gray-100 hover:text-purple-200"
                        : "text-gray-400 line-through"
                    }`}
                  >
                    {contact.name}
                  </Link>
                  {contact.email && (
                    <span className="text-gray-400">• {contact.email}</span>
                  )}
                  {contact.languages && (
                    <LanguageBadges languages={contact.languages} />
                  )}
                  {!isActive && (
                    <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Desativado
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(contact.id, contact.status)}
                  disabled={togglingId === contact.id}
                  className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                    isActive
                      ? "text-gray-400 hover:bg-orange-100 hover:text-orange-600"
                      : "text-gray-400 hover:bg-green-100 hover:text-green-600"
                  }`}
                  title={isActive ? "Desativar contato" : "Reativar contato"}
                >
                  {togglingId === contact.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isActive ? (
                    <UserX className="h-4 w-4" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
