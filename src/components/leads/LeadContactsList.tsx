"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteLeadContact, toggleLeadContactActive } from "@/actions/leads";
import { useRouter } from "next/navigation";
import { AddLeadContactModal } from "./AddLeadContactModal";
import { updateLeadContact } from "@/actions/leads";
import { Pencil, Trash2, X, Loader2, Linkedin, Instagram, Mail, Phone, MessageCircle, User, Briefcase, Copy, Check, UserX, UserCheck, Globe } from "lucide-react";
import { LanguageBadges, LanguageSelector, type LanguageEntry } from "@/components/shared/LanguageSelector";

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
  isActive: boolean;
  languages: string | null;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">{contact.name}</h3>
              <CopyButton value={contact.name} />
            </div>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-600">
              <Briefcase className="h-4 w-4" />
              {contact.role ? (
                <span className="flex items-center gap-1">
                  {contact.role}
                  <CopyButton value={contact.role} />
                </span>
              ) : (
                <span className="text-gray-400 italic">Cargo não informado</span>
              )}
            </p>
            {contact.isPrimary && (
              <span className="mt-2 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                Contato Principal
              </span>
            )}
          </div>

          {/* Contact Info - Always show all fields */}
          <div className="space-y-3">
            {/* Email */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-sm font-medium text-gray-900 hover:text-purple-600 break-all">
                    {contact.email}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400 italic">Não informado</span>
                )}
              </div>
              {contact.email && <CopyButton value={contact.email} />}
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telefone</p>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="text-sm font-medium text-gray-900 hover:text-purple-600">
                    {contact.phone}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400 italic">Não informado</span>
                )}
              </div>
              {contact.phone && <CopyButton value={contact.phone} />}
            </div>

            {/* WhatsApp */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">WhatsApp</p>
                {contact.whatsapp ? (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600"
                  >
                    {contact.whatsapp}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400 italic">Não informado</span>
                )}
              </div>
              {contact.whatsapp && <CopyButton value={contact.whatsapp} />}
            </div>

            {/* LinkedIn */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Linkedin className="h-5 w-5 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">LinkedIn</p>
                {contact.linkedin ? (
                  <a
                    href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://linkedin.com/in/${contact.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600 break-all"
                  >
                    {contact.linkedin}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400 italic">Não informado</span>
                )}
              </div>
              {contact.linkedin && <CopyButton value={contact.linkedin} />}
            </div>

            {/* Instagram */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100">
                <Instagram className="h-5 w-5 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instagram</p>
                {contact.instagram ? (
                  <a
                    href={contact.instagram.startsWith('http') ? contact.instagram : `https://instagram.com/${contact.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600"
                  >
                    {contact.instagram}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400 italic">Não informado</span>
                )}
              </div>
              {contact.instagram && <CopyButton value={contact.instagram} />}
            </div>

            {/* Languages */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <Globe className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Idiomas</p>
                <div className="mt-1">
                  <LanguageBadges languages={contact.languages} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-purple-600 px-4 py-3 text-base font-bold text-white hover:bg-purple-700 transition-colors shadow-md"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditContactModal({
  contact,
  isOpen,
  onClose,
  onSuccess,
}: {
  contact: LeadContact;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parseLanguages = (json: string | null): LanguageEntry[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  };

  const [form, setForm] = useState({
    name: contact.name,
    role: contact.role || "",
    email: contact.email || "",
    phone: contact.phone || "",
    whatsapp: contact.whatsapp || "",
    linkedin: contact.linkedin || "",
    instagram: contact.instagram || "",
    isPrimary: contact.isPrimary,
    languages: parseLanguages(contact.languages),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateLeadContact(contact.id, {
        name: form.name,
        role: form.role || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        linkedin: form.linkedin || undefined,
        instagram: form.instagram || undefined,
        isPrimary: form.isPrimary,
        languages: form.languages.length > 0 ? form.languages : null,
      });
      toast.success("Contato atualizado!");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar contato");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white rounded-t-xl">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="h-5 w-5" />
            Editar Contato
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Nome *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo</label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
            <input
              type="text"
              value={form.linkedin}
              onChange={(e) => update("linkedin", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Instagram</label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <LanguageSelector
            value={form.languages}
            onChange={(langs) => setForm((prev) => ({ ...prev, languages: langs }))}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-isPrimary"
              checked={form.isPrimary}
              onChange={(e) => update("isPrimary", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="edit-isPrimary" className="text-sm text-gray-700">
              Contato principal
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </form>
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
  const [editingContact, setEditingContact] = useState<LeadContact | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleActive(contactId: string, isActive: boolean) {
    setTogglingId(contactId);
    try {
      await toggleLeadContactActive(contactId);
      toast.success(isActive ? "Contato desativado" : "Contato reativado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar status");
    } finally {
      setTogglingId(null);
    }
  }

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
              onClick={() => setViewingContact(contact)}
              className={`flex items-start justify-between rounded-lg border p-4 transition-colors cursor-pointer ${
                contact.isActive
                  ? "border-gray-200 hover:border-purple-200 hover:bg-purple-50/30"
                  : "border-gray-100 bg-gray-50 opacity-50"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${contact.isActive ? "text-gray-900" : "text-gray-500 line-through"}`}>{contact.name}</h3>
                  {contact.isPrimary && (
                    <span className="inline-flex rounded bg-purple-600 px-2 py-0.5 text-xs font-medium text-white">
                      Principal
                    </span>
                  )}
                  {!contact.isActive && (
                    <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Desativado
                    </span>
                  )}
                </div>
                {contact.role && (
                  <p className="text-sm text-gray-500">{contact.role}</p>
                )}
                <div className="mt-1">
                  <LanguageBadges languages={contact.languages} />
                </div>
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
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleToggleActive(contact.id, contact.isActive)}
                  disabled={togglingId === contact.id}
                  className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
                    contact.isActive
                      ? "text-gray-500 hover:bg-orange-100 hover:text-orange-600"
                      : "text-gray-500 hover:bg-green-100 hover:text-green-600"
                  }`}
                  title={contact.isActive ? "Desativar contato" : "Reativar contato"}
                >
                  {contact.isActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                </button>
                {!isConverted && contact.isActive && (
                  <button
                    onClick={() => setEditingContact(contact)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                    title="Editar contato"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
                {!isConverted && contact.isActive && (
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

      {editingContact && (
        <EditContactModal
          contact={editingContact}
          isOpen={!!editingContact}
          onClose={() => setEditingContact(null)}
          onSuccess={() => {
            setEditingContact(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
