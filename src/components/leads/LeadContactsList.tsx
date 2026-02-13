"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteLeadContact } from "@/actions/leads";
import { useRouter } from "next/navigation";
import { AddLeadContactModal } from "./AddLeadContactModal";
import { Eye, Trash2, X, Linkedin, Instagram, Mail, Phone, MessageCircle, User, Briefcase } from "lucide-react";

type LeadContact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  instagram: string | null;
  isPrimary: boolean;
};

function ContactDetailModal({
  contact,
  isOpen,
  onClose,
}: {
  contact: LeadContact;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white rounded-t-xl">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <User className="h-5 w-5" />
            Detalhes do Contato
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Name and Role */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <User className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{contact.name}</h3>
            {contact.role && (
              <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-600">
                <Briefcase className="h-4 w-4" />
                {contact.role}
              </p>
            )}
            {contact.isPrimary && (
              <span className="mt-2 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                Contato Principal
              </span>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            {contact.email && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                  <a href={`mailto:${contact.email}`} className="text-sm font-medium text-gray-900 hover:text-purple-600">
                    {contact.email}
                  </a>
                </div>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telefone</p>
                  <a href={`tel:${contact.phone}`} className="text-sm font-medium text-gray-900 hover:text-purple-600">
                    {contact.phone}
                  </a>
                </div>
              </div>
            )}

            {contact.whatsapp && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">WhatsApp</p>
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600"
                  >
                    {contact.whatsapp}
                  </a>
                </div>
              </div>
            )}

            {contact.linkedin && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Linkedin className="h-5 w-5 text-blue-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">LinkedIn</p>
                  <a
                    href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://linkedin.com/in/${contact.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600 break-all"
                  >
                    {contact.linkedin}
                  </a>
                </div>
              </div>
            )}

            {contact.instagram && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
                  <Instagram className="h-5 w-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instagram</p>
                  <a
                    href={contact.instagram.startsWith('http') ? contact.instagram : `https://instagram.com/${contact.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600"
                  >
                    {contact.instagram}
                  </a>
                </div>
              </div>
            )}

            {!contact.email && !contact.phone && !contact.whatsapp && !contact.linkedin && !contact.instagram && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Nenhuma informação de contato adicional.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [viewingContact, setViewingContact] = useState<LeadContact | null>(null);

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
    <div className="rounded-xl bg-white p-6 shadow-md">
      <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">👥</span>
          Contatos ({leadContacts.length})
        </h2>
        {!isConverted && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#792990] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <span className="text-lg text-white">+</span>
            Adicionar Contato
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
              className="flex items-start justify-between rounded-lg border border-gray-200 p-4 hover:border-purple-200 hover:bg-purple-50/30 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{contact.name}</h3>
                  {contact.isPrimary && (
                    <span className="inline-flex rounded bg-purple-600 px-2 py-0.5 text-xs font-medium text-white">
                      Principal
                    </span>
                  )}
                </div>
                {contact.role && (
                  <p className="text-sm text-gray-500">{contact.role}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  {contact.email && (
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1">
                      <Mail className="h-3 w-3" /> Email
                    </span>
                  )}
                  {contact.phone && (
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1">
                      <Phone className="h-3 w-3" /> Telefone
                    </span>
                  )}
                  {contact.whatsapp && (
                    <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-green-700">
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </span>
                  )}
                  {contact.linkedin && (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-blue-700">
                      <Linkedin className="h-3 w-3" /> LinkedIn
                    </span>
                  )}
                  {contact.instagram && (
                    <span className="inline-flex items-center gap-1 rounded bg-pink-100 px-2 py-1 text-pink-700">
                      <Instagram className="h-3 w-3" /> Instagram
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingContact(contact)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                  title="Ver detalhes"
                >
                  <Eye className="h-5 w-5" />
                </button>
                {!isConverted && (
                  <button
                    onClick={() => handleDelete(contact.id)}
                    disabled={deletingId === contact.id}
                    className="rounded-lg p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 transition-colors"
                    title="Excluir contato"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddLeadContactModal
        leadId={leadId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {viewingContact && (
        <ContactDetailModal
          contact={viewingContact}
          isOpen={!!viewingContact}
          onClose={() => setViewingContact(null)}
        />
      )}
    </div>
  );
}
