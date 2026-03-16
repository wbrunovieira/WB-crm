"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserPlus, Users, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toggleActivityCompleted, assignLeadContactsToActivity, removeLeadContactsFromActivity } from "@/actions/activities";
import { toast } from "sonner";

type LeadContact = {
  id: string;
  name: string;
  role: string | null;
  isPrimary: boolean;
};

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  leadContactIds: string | null;
};

export function LeadActivitiesList({
  leadId,
  activities,
  leadContacts = [],
}: {
  leadId: string;
  activities: Activity[];
  leadContacts?: LeadContact[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [assigningActivity, setAssigningActivity] = useState<Activity | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [savingContacts, setSavingContacts] = useState(false);

  const openAssignModal = (e: React.MouseEvent, activity: Activity) => {
    e.preventDefault();
    e.stopPropagation();
    const existing = activity.leadContactIds ? JSON.parse(activity.leadContactIds) as string[] : [];
    setSelectedContactIds(new Set(existing));
    setAssigningActivity(activity);
  };

  const handleSaveContacts = async () => {
    if (!assigningActivity) return;
    setSavingContacts(true);
    try {
      if (selectedContactIds.size === 0) {
        await removeLeadContactsFromActivity(assigningActivity.id);
      } else {
        await assignLeadContactsToActivity(assigningActivity.id, Array.from(selectedContactIds));
      }
      toast.success("Contatos atualizados");
      setAssigningActivity(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar contatos");
    } finally {
      setSavingContacts(false);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const getContactNames = (leadContactIdsJson: string | null): string[] => {
    if (!leadContactIdsJson) return [];
    try {
      const ids = JSON.parse(leadContactIdsJson) as string[];
      return ids.map((id) => {
        const contact = leadContacts.find((c) => c.id === id);
        return contact?.name ?? "Desconhecido";
      });
    } catch {
      return [];
    }
  };

  const typeConfig: Record<string, { label: string; bg: string; text: string; hoverBg: string; hoverText: string }> = {
    call: { label: "Ligação", bg: "bg-blue-100", text: "text-blue-800", hoverBg: "group-hover:bg-blue-200", hoverText: "group-hover:text-blue-900" },
    meeting: { label: "Reunião", bg: "bg-pink-100", text: "text-pink-800", hoverBg: "group-hover:bg-pink-200", hoverText: "group-hover:text-pink-900" },
    email: { label: "E-mail", bg: "bg-purple-100", text: "text-purple-800", hoverBg: "group-hover:bg-purple-200", hoverText: "group-hover:text-purple-900" },
    task: { label: "Tarefa", bg: "bg-amber-100", text: "text-amber-800", hoverBg: "group-hover:bg-amber-200", hoverText: "group-hover:text-amber-900" },
    whatsapp: { label: "WhatsApp", bg: "bg-green-100", text: "text-green-800", hoverBg: "group-hover:bg-green-200", hoverText: "group-hover:text-green-900" },
    linkedin: { label: "LinkedIn", bg: "bg-sky-100", text: "text-sky-800", hoverBg: "group-hover:bg-sky-200", hoverText: "group-hover:text-sky-900" },
    instagram: { label: "Instagram", bg: "bg-rose-100", text: "text-rose-800", hoverBg: "group-hover:bg-rose-200", hoverText: "group-hover:text-rose-900" },
    physical_visit: { label: "Visita", bg: "bg-teal-100", text: "text-teal-800", hoverBg: "group-hover:bg-teal-200", hoverText: "group-hover:text-teal-900" },
  };

  const handleToggle = async (e: React.MouseEvent, activityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingId(activityId);
    try {
      await toggleActivityCompleted(activityId);
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📅</span>
          Atividades ({activities.length})
        </h2>
        <Link
          href={`/activities/new?leadId=${leadId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#792990] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <span className="text-lg text-white">+</span>
          Adicionar Atividade
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Nenhuma atividade registrada ainda.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Adicione atividades para acompanhar o progresso deste lead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="group rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:border-purple-300 hover:bg-purple-50/60 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                {/* Toggle button */}
                <button
                  onClick={(e) => handleToggle(e, activity.id)}
                  disabled={loadingId === activity.id}
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    activity.completed
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 bg-white hover:border-primary hover:bg-primary/10"
                  } disabled:opacity-50`}
                  title={activity.completed ? "Marcar como pendente" : "Marcar como concluída"}
                >
                  {loadingId === activity.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : activity.completed ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                </button>

                {/* Content - clickable link */}
                <Link
                  href={`/activities/${activity.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${typeConfig[activity.type]?.bg ?? "bg-gray-100"} ${typeConfig[activity.type]?.text ?? "text-gray-800"} ${typeConfig[activity.type]?.hoverBg ?? ""} ${typeConfig[activity.type]?.hoverText ?? ""}`}>
                      {typeConfig[activity.type]?.label ?? activity.type}
                    </span>
                    {activity.completed && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Concluída
                      </span>
                    )}
                  </div>
                  <h3 className={`mt-2 font-medium group-hover:text-purple-900 ${activity.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                    {activity.subject}
                  </h3>
                  {activity.description && (
                    <p className="mt-1 text-sm text-gray-600 group-hover:text-gray-700 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {/* Assigned contacts */}
                  {(() => {
                    const names = getContactNames(activity.leadContactIds);
                    return names.length > 0 ? (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Users className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                        {names.map((name, i) => (
                          <span key={i} className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {activity.dueDate && (
                    <p className="mt-2 text-xs text-gray-500 group-hover:text-gray-600">
                      Vencimento: {formatDate(activity.dueDate)}
                    </p>
                  )}
                </Link>

                {/* Assign contacts button */}
                {leadContacts.length > 0 && (
                  <button
                    onClick={(e) => openAssignModal(e, activity)}
                    className={`mt-0.5 flex-shrink-0 rounded-lg p-2 transition-colors ${
                      activity.leadContactIds
                        ? "text-purple-500 hover:bg-purple-100 hover:text-purple-700"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    }`}
                    title="Associar contatos"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                )}

                {/* Arrow */}
                <Link href={`/activities/${activity.id}`} className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-gray-400 group-hover:text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Contacts Modal */}
      {assigningActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssigningActivity(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white rounded-t-xl">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <UserPlus className="h-5 w-5" />
                Associar Contatos
              </h2>
              <button onClick={() => setAssigningActivity(null)} className="rounded-lg p-1.5 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <p className="mb-3 text-sm text-gray-600 truncate">
                {assigningActivity.subject}
              </p>

              <div className="space-y-2">
                {leadContacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedContactIds.has(contact.id)
                        ? "border-purple-300 bg-purple-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                      {contact.role && (
                        <p className="text-xs text-gray-500">{contact.role}</p>
                      )}
                    </div>
                    {contact.isPrimary && (
                      <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Principal
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 border-t bg-gray-50 px-4 py-3 rounded-b-xl">
              <button
                onClick={() => setAssigningActivity(null)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContacts}
                disabled={savingContacts}
                className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {savingContacts ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
