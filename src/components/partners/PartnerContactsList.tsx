"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MessageCircle,
  Linkedin,
  Instagram,
  User,
  Briefcase,
  Pencil,
  Trash2,
  X,
  Loader2,
  Copy,
  Check,
  UserX,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PhoneLink } from "@/components/ui/phone-link";
import GmailButton from "@/components/gmail/GmailButton";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { WhatsAppCheckButton } from "@/components/whatsapp/WhatsAppCheckButton";
import type { PartnerContact } from "@/types/partner";

/** A contact is considered inactive when its status is anything other than "active". */
function isInactive(contact: PartnerContact): boolean {
  return (contact.status ?? "active") !== "active";
}

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
      type="button"
      onClick={handleCopy}
      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      title="Copiar"
      aria-label="Copiar"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function ContactDetailModal({
  contact,
  partnerId,
  partnerName,
  onClose,
}: {
  contact: PartnerContact;
  partnerId: string;
  partnerName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <User className="h-5 w-5" />
            Detalhes do Contato
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/20" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
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
              {contact.role || contact.position ? (
                <span>{contact.role ?? contact.position}</span>
              ) : (
                <span className="text-gray-400 italic">Cargo não informado</span>
              )}
            </p>
            {contact.isPrimary && (
              <span className="mt-2 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                Contato Principal
              </span>
            )}
          </div>

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
              {contact.email && (
                <div className="flex items-center gap-1">
                  <GmailButton to={contact.email} name={contact.name} companyName={partnerName} partnerId={partnerId} contactId={contact.id} variant="icon" />
                  <CopyButton value={contact.email} />
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telefone</p>
                {contact.phone ? (
                  <PhoneLink phone={contact.phone} className="text-sm font-medium text-gray-900 hover:text-purple-600" />
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
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600"
                  >
                    {contact.whatsapp}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400 italic">Não informado</span>
                )}
                {(contact.whatsapp || contact.phone) && (
                  <div className="mt-1">
                    <WhatsAppCheckButton
                      phone={(contact.whatsapp || contact.phone)!}
                      entityType="contact"
                      entityId={contact.id}
                      country={undefined}
                    />
                  </div>
                )}
              </div>
              {(contact.whatsapp || contact.phone) && (
                <div className="flex items-center gap-1">
                  <WhatsAppButton to={(contact.whatsapp || contact.phone)!} name={contact.name} partnerId={partnerId} contactId={contact.id} variant="icon" />
                  {contact.whatsapp && <CopyButton value={contact.whatsapp} />}
                </div>
              )}
            </div>

            {/* LinkedIn */}
            {contact.linkedin && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Linkedin className="h-5 w-5 text-blue-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">LinkedIn</p>
                  <a
                    href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://linkedin.com/in/${contact.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600 break-all"
                  >
                    {contact.linkedin}
                  </a>
                </div>
                <CopyButton value={contact.linkedin} />
              </div>
            )}

            {/* Instagram */}
            {contact.instagram && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100">
                  <Instagram className="h-5 w-5 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instagram</p>
                  <a
                    href={contact.instagram.startsWith("http") ? contact.instagram : `https://instagram.com/${contact.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-purple-600"
                  >
                    {contact.instagram}
                  </a>
                </div>
                <CopyButton value={contact.instagram} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <Link
            href={`/contacts/${contact.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-purple-200 px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Página completa
          </Link>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-3 text-sm font-bold text-white hover:bg-purple-700 transition-colors"
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
  partnerId,
  onClose,
  onSuccess,
}: {
  contact: PartnerContact;
  partnerId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: contact.name,
    role: contact.role ?? contact.position ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    whatsapp: contact.whatsapp ?? "",
    linkedin: contact.linkedin ?? "",
    instagram: contact.instagram ?? "",
  });

  const update = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/contacts/${contact.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          role: form.role || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          linkedin: form.linkedin || undefined,
          instagram: form.instagram || undefined,
          // Keep the contact linked to this partner on save.
          companyType: "partner",
          companyId: partnerId,
        }),
      });
      toast.success("Contato atualizado!");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar contato");
    } finally {
      setLoading(false);
    }
  };

  const fields: Array<{ key: keyof typeof form; label: string; type?: string; required?: boolean }> = [
    { key: "name", label: "Nome", required: true },
    { key: "role", label: "Cargo" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Telefone" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "instagram", label: "Instagram" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="h-5 w-5" />
            Editar Contato
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/20" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700">
                {f.label}
                {f.required && " *"}
              </label>
              <input
                type={f.type ?? "text"}
                required={f.required}
                value={form[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
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

export function PartnerContactsList({
  partnerId,
  partnerName,
  contacts,
}: {
  partnerId: string;
  partnerName: string;
  contacts: PartnerContact[];
}) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [viewing, setViewing] = useState<PartnerContact | null>(null);
  const [editing, setEditing] = useState<PartnerContact | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleToggleActive(contact: PartnerContact) {
    const inactive = isInactive(contact);
    setTogglingId(contact.id);
    try {
      // The endpoint is a pure toggle (server flips active↔inactive); it takes no body.
      await apiFetch(`/contacts/${contact.id}/status`, token, { method: "PATCH" });
      toast.success(inactive ? "Contato reativado" : "Contato desativado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status");
    } finally {
      setTogglingId(null);
    }
  }

  function handleDelete(contact: PartnerContact) {
    toast.warning("Tem certeza que deseja excluir este contato?", {
      action: {
        label: "Confirmar",
        onClick: async () => {
          setDeletingId(contact.id);
          try {
            await apiFetch(`/contacts/${contact.id}`, token, { method: "DELETE" });
            toast.success("Contato excluído com sucesso!");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao excluir contato");
          } finally {
            setDeletingId(null);
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  }

  return (
    <div id="contatos" className="scroll-mt-52 rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900">Contatos ({contacts.length})</h2>
        <Link
          href={`/contacts/new?partnerId=${partnerId}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          + Novo Contato
        </Link>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum contato cadastrado</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((contact) => {
            const inactive = isInactive(contact);
            return (
              <li
                key={contact.id}
                onClick={() => setViewing(contact)}
                className={`flex items-start justify-between rounded-lg border p-4 transition-colors cursor-pointer ${
                  inactive
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium ${inactive ? "text-gray-500 line-through" : "text-gray-900"}`}>{contact.name}</h3>
                    {contact.isPrimary && (
                      <span className="inline-flex rounded bg-purple-600 px-2 py-0.5 text-xs font-medium text-white">Principal</span>
                    )}
                    {inactive && (
                      <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Desativado</span>
                    )}
                  </div>
                  {(contact.role || contact.position) && (
                    <p className="text-sm text-gray-500">{contact.role ?? contact.position}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {contact.email && (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-700">
                        <Mail className="h-3 w-3" /> Email
                      </span>
                    )}
                    {contact.phone && (
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-gray-600">
                        <Phone className="h-3 w-3" /> Telefone
                      </span>
                    )}
                    {contact.whatsapp && (
                      <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-green-700">
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </span>
                    )}
                    {contact.linkedin && (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-700">
                        <Linkedin className="h-3 w-3" /> LinkedIn
                      </span>
                    )}
                    {contact.instagram && (
                      <span className="inline-flex items-center gap-1 rounded bg-pink-50 px-2 py-1 text-pink-700">
                        <Instagram className="h-3 w-3" /> Instagram
                      </span>
                    )}
                  </div>
                  {/* Quick actions */}
                  <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {(contact.whatsapp || contact.phone) && (
                      <WhatsAppButton to={(contact.whatsapp || contact.phone)!} name={contact.name} partnerId={partnerId} contactId={contact.id} variant="icon" />
                    )}
                    {contact.email && (
                      <GmailButton to={contact.email} name={contact.name} companyName={partnerName} partnerId={partnerId} contactId={contact.id} variant="icon" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleActive(contact)}
                    disabled={togglingId === contact.id}
                    className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
                      inactive ? "text-gray-500 hover:bg-green-100 hover:text-green-600" : "text-gray-500 hover:bg-orange-100 hover:text-orange-600"
                    }`}
                    title={inactive ? "Reativar contato" : "Desativar contato"}
                    aria-label={inactive ? "Reativar contato" : "Desativar contato"}
                  >
                    {inactive ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setEditing(contact)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                    title="Editar contato"
                    aria-label="Editar contato"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact)}
                    disabled={deletingId === contact.id}
                    className="rounded-lg p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 transition-colors"
                    title="Excluir contato"
                    aria-label="Excluir contato"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewing && (
        <ContactDetailModal contact={viewing} partnerId={partnerId} partnerName={partnerName} onClose={() => setViewing(null)} />
      )}

      {editing && (
        <EditContactModal
          contact={editing}
          partnerId={partnerId}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
