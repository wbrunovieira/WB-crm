import { backendFetch } from "@/lib/backend/client";
import type { ContactSummary } from "@/types/contact";
import type { UserListItem } from "@/hooks/users/use-users";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ActivityTypeIcon from "@/components/activities/ActivityTypeIcon";
import ToggleCompletedButton from "@/components/activities/ToggleCompletedButton";
import DeleteActivityButton from "@/components/activities/DeleteActivityButton";
import { ActivitiesSortSelect } from "@/components/activities/ActivitiesSortSelect";
import { ActivitiesDateFilter } from "@/components/activities/ActivitiesDateFilter";
import { ShowArchivedToggle } from "@/components/activities/ShowArchivedToggle";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { OwnerBadge } from "@/components/shared/OwnerBadge";
import { ActivityOutcomeButtons } from "@/components/activities/ActivityOutcomeButtons";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WhatsAppMessageLog from "@/components/whatsapp/WhatsAppMessageLog";

// Generate consistent color for cadence name
const CADENCE_COLORS = [
  { border: "border-purple-400", badge: "bg-purple-100 text-purple-800" },
  { border: "border-cyan-400", badge: "bg-cyan-100 text-cyan-800" },
  { border: "border-emerald-400", badge: "bg-emerald-100 text-emerald-800" },
  { border: "border-orange-400", badge: "bg-orange-100 text-orange-800" },
  { border: "border-pink-400", badge: "bg-pink-100 text-pink-800" },
  { border: "border-sky-400", badge: "bg-sky-100 text-sky-800" },
  { border: "border-lime-400", badge: "bg-lime-100 text-lime-800" },
  { border: "border-violet-400", badge: "bg-violet-100 text-violet-800" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCadenceBorderColor(name: string): string {
  return CADENCE_COLORS[hashString(name) % CADENCE_COLORS.length].border;
}

function getCadenceBadgeColor(name: string): string {
  return CADENCE_COLORS[hashString(name) % CADENCE_COLORS.length].badge;
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: { type?: string; completed?: string; sortBy?: string; owner?: string; dateFrom?: string; dateTo?: string; showArchived?: string; outcome?: string };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  // Default to pending (completed=false) when no status filter is specified
  const hasStatusFilter = searchParams.completed !== undefined || searchParams.outcome !== undefined;
  const effectiveCompleted = hasStatusFilter ? searchParams.completed : "false";

  const qs = new URLSearchParams();
  if (searchParams.type) qs.set("type", searchParams.type);
  if (effectiveCompleted && effectiveCompleted !== "all") qs.set("completed", effectiveCompleted);
  if (searchParams.sortBy) qs.set("sortBy", searchParams.sortBy);
  if (searchParams.owner) qs.set("owner", searchParams.owner);
  if (searchParams.dateFrom) qs.set("dateFrom", searchParams.dateFrom);
  if (searchParams.dateTo) qs.set("dateTo", searchParams.dateTo);
  if (searchParams.showArchived === "true") qs.set("includeArchivedLeads", "true");
  if (searchParams.outcome) qs.set("outcome", searchParams.outcome);

  const activities = await backendFetch<unknown[]>(`/activities${qs.toString() ? `?${qs}` : ""}`).catch(() => []);

  // Fetch available data for the modal
  const [deals, contacts, leads, partners, users] = await Promise.all([
    backendFetch<{ id: string; title: string }[]>("/deals").catch(() => []),
    backendFetch<ContactSummary[]>("/contacts").catch(() => []),
    backendFetch<{ leads: { id: string; businessName: string }[] }>("/leads?isProspect=false&isArchived=false&pageSize=200").then(r => r.leads).catch(() => []),
    backendFetch<{ id: string; name: string }[]>("/partners").catch(() => []),
    backendFetch<UserListItem[]>('/users').catch(() => [] as UserListItem[]),
  ]);

  const availableData = {
    deals: deals.map(d => ({ id: d.id, title: d.title })),
    contacts: contacts.map(c => ({ id: c.id, name: c.name })),
    leads: leads.map(l => ({ id: l.id, businessName: l.businessName })),
    partners: partners.map(p => ({ id: p.id, name: p.name })),
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atividades</h1>
          <p className="mt-2 text-gray-600">
            Gerencie suas tarefas e compromissos
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/activities/calendar"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            📅 Calendário
          </Link>
          <Link
            href="/activities/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Nova Atividade
          </Link>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-4">
          <Link
            href="/activities?completed=all"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              searchParams.completed === "all"
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Todas
          </Link>
          <Link
            href="/activities?completed=false"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              searchParams.completed === "false" || (!searchParams.completed && !searchParams.outcome)
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Pendentes
          </Link>
          <Link
            href="/activities?completed=true"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              searchParams.completed === "true"
                ? "bg-primary text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Concluídas
          </Link>
          <Link
            href="/activities?outcome=failed"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              searchParams.outcome === "failed"
                ? "bg-red-600 text-white"
                : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
            }`}
          >
            Falhadas
          </Link>
          <Link
            href="/activities?outcome=skipped"
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              searchParams.outcome === "skipped"
                ? "bg-amber-600 text-white"
                : "bg-white text-amber-600 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            Puladas
          </Link>
        </div>

        {/* Type Filters and Sort */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { type: "call", label: "Ligações", icon: "📞" },
              { type: "meeting", label: "Reuniões", icon: "📅" },
              { type: "email", label: "E-mails", icon: "✉️" },
              { type: "task", label: "Tarefas", icon: "📋" },
              { type: "whatsapp", label: "WhatsApp", icon: "💬" },
              { type: "visit", label: "Visitas", icon: "📍" },
              { type: "instagram", label: "Instagram", icon: "📷" },
            ].map(({ type, label, icon }) => (
              <Link
                key={type}
                href={`/activities?type=${type}`}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                  searchParams.type === type
                    ? "bg-primary text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Date Filter, Sort, Owner */}
          <div className="flex items-center gap-4">
            <ShowArchivedToggle />
            <ActivitiesDateFilter />
            <ActivitiesSortSelect />
            {isAdmin && users.length > 0 && (
              <OwnerFilter users={users} currentUserId={currentUserId} />
            )}
          </div>
        </div>
      </div>

      {/* Activity Counter */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-semibold text-purple-800">
          {activities.length} {activities.length === 1 ? "atividade" : "atividades"}
        </span>
        {(searchParams.type || searchParams.completed || searchParams.dateFrom || searchParams.dateTo || searchParams.owner || searchParams.showArchived || searchParams.outcome) && (
          <span className="text-sm text-gray-500">com os filtros aplicados</span>
        )}
      </div>

      <div className="space-y-4">
        {activities.map((activity) => {
          // Determine border color: failed/skipped take priority, then cadence color
          const cadenceName = activity.cadenceActivity?.leadCadence?.cadence?.name;
          const cadenceBorderColor = cadenceName
            ? getCadenceBorderColor(cadenceName)
            : "";
          const borderClass = activity.failedAt
            ? "border-l-4 border-red-400"
            : activity.skippedAt
              ? "border-l-4 border-amber-400"
              : cadenceBorderColor
                ? `border-l-4 ${cadenceBorderColor}`
                : "";

          return (
          <div
            key={activity.id}
            className={`rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md ${borderClass}`}
          >
            <div className="flex items-start gap-6">
              {/* Date Badge on Left */}
              <div className={`flex flex-col items-center justify-center rounded-lg px-4 py-3 min-w-[80px] ${
                activity.dueDate
                  ? "bg-blue-50 border-2 border-blue-200"
                  : "bg-gray-50 border-2 border-gray-200"
              }`}>
                {activity.dueDate ? (
                  <>
                    <span className="text-2xl font-bold text-blue-700">
                      {new Date(activity.dueDate).getDate()}
                    </span>
                    <span className="text-xs font-medium text-blue-600 uppercase">
                      {new Date(activity.dueDate).toLocaleDateString("pt-BR", { month: "short" })}
                    </span>
                    <span className="text-xs text-blue-500">
                      {new Date(activity.dueDate).getFullYear()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-bold text-gray-400">--</span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">Sem data</span>
                  </>
                )}
              </div>

              <div className="flex items-start gap-4 flex-1">
                <ToggleCompletedButton
                  activityId={activity.id}
                  completed={activity.completed}
                  dealId={activity.dealId}
                  contactId={activity.contactId}
                  leadId={activity.leadId}
                  partnerId={activity.partnerId}
                  previousActivity={{
                    type: activity.type,
                    subject: activity.subject,
                    description: activity.description,
                    dealId: activity.dealId,
                    dealTitle: activity.deal?.title,
                    contactId: activity.contactId,
                    contactName: activity.contact?.name,
                    contactIds: activity.contactIds,
                    leadId: activity.leadId,
                    leadName: activity.lead?.businessName,
                    partnerId: activity.partnerId,
                    partnerName: activity.partner?.name,
                  }}
                  availableData={availableData}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <ActivityTypeIcon type={activity.type} />
                    <Link
                      href={`/activities/${activity.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-primary"
                    >
                      {activity.subject}
                    </Link>
                    {isAdmin && activity.owner && (
                      <OwnerBadge
                        ownerName={activity.owner.name}
                        isCurrentUser={activity.owner.id === currentUserId}
                      />
                    )}
                    {activity.completed && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Concluída{activity.completedAt && ` em ${formatDate(activity.completedAt)}`}
                      </span>
                    )}
                    {activity.failedAt && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                        Falhou
                      </span>
                    )}
                    {activity.skippedAt && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Pulada
                      </span>
                    )}
                    {activity.cadenceActivity?.leadCadence?.cadence && (
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getCadenceBadgeColor(activity.cadenceActivity.leadCadence.cadence.name)}`}>
                        {activity.cadenceActivity.leadCadence.cadence.name}
                      </span>
                    )}
                    {activity.cadenceActivity?.leadCadence?.cadence?.icp && (
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-800">
                        {activity.cadenceActivity.leadCadence.cadence.icp.name}
                      </span>
                    )}
                  </div>

                  {activity.description && (
                    activity.type === "whatsapp" ? (
                      <div className="mt-2 rounded-xl border border-[#25D366]/20 bg-[#f0fdf4] p-3">
                        <WhatsAppMessageLog
                          description={activity.description}
                          previewCount={3}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-600">
                        {activity.description}
                      </p>
                    )
                  )}

                  {activity.failReason && (
                    <p className="mt-1 text-sm text-red-600">
                      Motivo: {activity.failReason}
                    </p>
                  )}
                  {activity.skipReason && (
                    <p className="mt-1 text-sm text-amber-600">
                      Motivo: {activity.skipReason}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                    {activity.dueDate && (
                      <div className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          Vencimento: {formatDate(activity.dueDate)}
                        </span>
                      </div>
                    )}

                    {activity.deal && (
                      <Link
                        href={`/deals/${activity.deal.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{activity.deal.title}</span>
                      </Link>
                    )}

                    {activity.contact && (
                      <Link
                        href={`/contacts/${activity.contact.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span>{activity.contact.name}</span>
                      </Link>
                    )}

                    {activity.lead && (
                      <Link
                        href={`/leads/${activity.lead.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span>{activity.lead.businessName}</span>
                      </Link>
                    )}

                    {activity.partner && (
                      <Link
                        href={`/partners/${activity.partner.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>{activity.partner.name}</span>
                      </Link>
                    )}

                    {activity.deal?.organization && (
                      <Link
                        href={`/organizations/${activity.deal.organization.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span>{activity.deal.organization.name}</span>
                      </Link>
                    )}

                    {activity.contact?.organization && !activity.deal?.organization && (
                      <Link
                        href={`/organizations/${activity.contact.organization.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span>{activity.contact.organization.name}</span>
                      </Link>
                    )}

                    {activity.contact?.partner && !activity.partner && (
                      <Link
                        href={`/partners/${activity.contact.partner.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>{activity.contact.partner.name}</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                  <ActivityOutcomeButtons
                    activityId={activity.id}
                    completed={activity.completed}
                    failedAt={activity.failedAt}
                    skippedAt={activity.skippedAt}
                  />
                  <Link
                    href={`/activities/${activity.id}/edit`}
                    className="text-gray-600 hover:text-primary"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </Link>
                  <DeleteActivityButton activityId={activity.id} />
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {activities.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhuma atividade encontrada
          </h3>
          <p className="mt-2 text-gray-500">
            Comece criando sua primeira atividade.
          </p>
          <Link
            href="/activities/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Nova Atividade
          </Link>
        </div>
      )}
    </div>
  );
}
