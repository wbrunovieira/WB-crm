import { backendFetch } from "@/lib/backend/client";
import type { Partner } from "@/types/partner";
import { PhoneLink } from "@/components/ui/phone-link";
import { EntityManagementPanel } from "@/components/shared/entity-management";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletePartnerButton } from "@/components/partners/DeletePartnerButton";
import { CopyBookingLinkButton } from "@/components/partners/CopyBookingLinkButton";
import MeetingsList from "@/components/meetings/MeetingsList";
import type { Meeting } from "@/components/meetings/MeetingsList";
import { EntityNotesBlock } from "@/components/shared/EntityNotesBlock";
import { LastContactAlert } from "@/components/shared/LastContactAlert";
import { PartnerProductsSection } from "@/components/partners/PartnerProductsSection";
import { PartnerContactsList } from "@/components/partners/PartnerContactsList";
import { PartnerActivitiesList } from "@/components/partners/PartnerActivitiesList";
import { PartnerStatusBadge } from "@/components/partners/PartnerStatusBadge";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import GmailButton from "@/components/gmail/GmailButton";
import { Building2, Users, Activity, Video, Package, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [partner, session, meetings, callAnalyses, meetAnalyses, gkAnalyses] = await Promise.all([
    backendFetch<Partner>(`/partners/${params.id}`).catch(() => null),
    getServerSession(authOptions),
    backendFetch<Meeting[]>(`/meetings?partnerId=${params.id}`).catch((): Meeting[] => []),
    backendFetch<{ id: string; activityId: string; score: number | null; status: string }[]>("/call-analysis").catch(() => []),
    backendFetch<{ id: string; activityId: string; score: number | null; status: string }[]>("/meet-analysis").catch(() => []),
    backendFetch<{ id: string; activityId: string; score: number | null; status: string }[]>("/gatekeeper-analysis").catch(() => []),
  ]);

  if (!partner) {
    notFound();
  }

  const callAnalysesMap = Object.fromEntries(
    callAnalyses.map((a) => [a.activityId, { id: a.id, score: a.score, status: a.status }])
  );
  const meetAnalysesMap = Object.fromEntries(
    meetAnalyses.map((a) => [a.activityId, { id: a.id, score: a.score, status: a.status }])
  );
  const gkAnalysesMap = Object.fromEntries(
    gkAnalyses.map((a) => [a.activityId, { id: a.id, score: a.score, status: a.status }])
  );
  // Activity IDs whose linked Meeting has a transcript (enables the meet-analysis trigger)
  const meetTranscriptActivityIds = new Set(
    (meetings ?? []).filter((m) => m.transcriptText && m.activityId).map((m) => m.activityId!)
  );

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  // Derived signal: this partner has already produced a client (a referred lead that
  // converted into an organization). Not stored — computed from referrals.
  const broughtClient = partner.referredLeads.some((l) => l.convertedToOrganizationId);

  return (
    <div className="min-h-screen bg-[#350045] p-4 md:p-8">
      {/* ── Header card (sticky, mirrors the lead page) ─────────────────── */}
      <div className="sticky top-16 z-40 mb-6 rounded-2xl border border-purple-900/40 bg-white px-4 py-4 shadow-lg md:px-6 md:py-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl md:text-3xl">
                {partner.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                  {partner.partnerType}
                </span>
                <PartnerStatusBadge status={partner.partnerStatus} />
                {broughtClient && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    ✓ Já trouxe cliente
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <CopyBookingLinkButton partnerId={partner.id} />
              <DeletePartnerButton partnerId={partner.id} />
              <Link
                href={`/partners/${partner.id}/edit`}
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-700 sm:text-sm"
              >
                <Pencil size={13} />
                <span className="hidden sm:inline">Editar</span>
              </Link>
            </div>
          </div>

          {/* Quick-nav pills */}
          <div className="flex flex-wrap gap-1.5 border-t border-purple-900/20 pt-3">
            {[
              { href: "#info-basica", icon: <Building2 size={11} />, label: "Informações" },
              { href: "#contatos", icon: <Users size={11} />, label: "Contatos" },
              { href: "#atividades", icon: <Activity size={11} />, label: "Atividades" },
              { href: "#reunioes", icon: <Video size={11} />, label: "Reuniões" },
              { href: "#produtos", icon: <Package size={11} />, label: "Produtos" },
            ].map(({ href, icon, label }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
              >
                {icon}
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Last contact (derived from the most recent contact activity) */}
      <LastContactAlert lastContactAt={partner.lastContactAt} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <div id="info-basica" className="scroll-mt-52 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nome da Empresa</dt>
              <dd className="mt-1 text-sm text-gray-900">{partner.name}</dd>
            </div>
            {partner.legalName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Razão Social</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.legalName}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Tipo de Parceria
              </dt>
              <dd className="mt-1">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  {partner.partnerType}
                </span>
              </dd>
            </div>
            {partner.industry && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Setor</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.industry}</dd>
              </div>
            )}
            {partner.expertise && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Expertise</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {partner.expertise}
                </dd>
              </div>
            )}
            {partner.employeeCount && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Funcionários</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.employeeCount}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Cadastrado em
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(partner.createdAt)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Contato da Empresa</h2>
          {(partner.whatsapp || partner.phone || partner.email) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {(partner.whatsapp || partner.phone) && (
                <WhatsAppButton
                  to={(partner.whatsapp || partner.phone) as string}
                  name={partner.name}
                  partnerId={partner.id}
                />
              )}
              {partner.email && (
                <GmailButton
                  to={partner.email}
                  name={partner.name}
                  companyName={partner.name}
                  partnerId={partner.id}
                />
              )}
            </div>
          )}
          <dl className="space-y-4">
            {partner.website && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {partner.website}
                  </a>
                </dd>
              </div>
            )}
            {partner.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`mailto:${partner.email}`}
                    className="text-primary hover:underline"
                  >
                    {partner.email}
                  </a>
                </dd>
              </div>
            )}
            {partner.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <PhoneLink phone={partner.phone} className="text-gray-900 hover:text-primary" />
                </dd>
              </div>
            )}
            {partner.whatsapp && (
              <div>
                <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`https://wa.me/${partner.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {partner.whatsapp}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Location */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Localização</h2>
          <dl className="space-y-4">
            {partner.streetAddress && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.streetAddress}</dd>
              </div>
            )}
            {partner.city && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cidade</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.city}</dd>
              </div>
            )}
            {partner.state && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.state}</dd>
              </div>
            )}
            {partner.zipCode && (
              <div>
                <dt className="text-sm font-medium text-gray-500">CEP</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.zipCode}</dd>
              </div>
            )}
            {partner.country && (
              <div>
                <dt className="text-sm font-medium text-gray-500">País</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.country}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Social Media */}
      {(partner.linkedin || partner.instagram || partner.facebook || partner.twitter) && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Redes Sociais</h2>
          <dl className="grid gap-4 md:grid-cols-2">
            {partner.linkedin && (
              <div>
                <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={partner.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {partner.linkedin}
                  </a>
                </dd>
              </div>
            )}
            {partner.instagram && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Instagram</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.instagram}</dd>
              </div>
            )}
            {partner.facebook && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Facebook</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.facebook}</dd>
              </div>
            )}
            {partner.twitter && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Twitter/X</dt>
                <dd className="mt-1 text-sm text-gray-900">{partner.twitter}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Description */}
      {partner.description && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Descrição</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {partner.description}
          </p>
        </div>
      )}

      {/* Contacts */}
      <div className="mt-6">
        <PartnerContactsList partnerId={partner.id} partnerName={partner.name} contacts={partner.contacts} />
      </div>

      {/* Activities (rich timeline, mirrors the lead page) */}
      <div className="mt-6">
        <PartnerActivitiesList
          partnerId={partner.id}
          activities={partner.activities}
          callAnalysesMap={callAnalysesMap}
          meetAnalysesMap={meetAnalysesMap}
          meetTranscriptActivityIds={meetTranscriptActivityIds}
          gkAnalysesMap={gkAnalysesMap}
        />
      </div>

      {/* Referred Leads */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Leads Indicados ({partner.referredLeads.length})
            </h2>
          </div>
          {partner.referredLeads.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum lead indicado ainda</p>
          ) : (
            <ul className="space-y-3">
              {partner.referredLeads.map((lead) => (
                <li key={lead.id} className="border-b border-gray-100 pb-2">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {lead.businessName}
                  </Link>
                  {lead.convertedToOrganizationId && (
                    <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Convertido
                    </span>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatDate(lead.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Statistics and Notes */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Estatísticas</h2>
          <dl className="grid gap-4 grid-cols-3">
            <div className="text-center">
              <dt className="text-xs font-medium text-gray-500">Contatos</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {partner._count.contacts}
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs font-medium text-gray-500">Atividades</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {partner._count.activities}
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-xs font-medium text-gray-500">Leads Indicados</dt>
              <dd className="mt-1 text-2xl font-bold text-green-600">
                {partner._count.referredLeads}
              </dd>
            </div>
          </dl>
        </div>

        <EntityNotesBlock
          patchUrl={`/partners/${partner.id}`}
          initialNotes={partner.notes}
          entityLabel="parceiro"
        />
      </div>

      {/* Meetings */}
      <div id="reunioes" className="mt-6 scroll-mt-52">
        <MeetingsList
          meetings={meetings ?? []}
          partnerId={partner.id}
          defaultLocation={[partner.streetAddress, partner.city, partner.state, partner.zipCode].filter(Boolean).join(", ")}
          suggestedContacts={[
            ...(partner.email
              ? [{ id: `partner-${partner.id}`, name: partner.name, email: partner.email, role: "Empresa" }]
              : []),
            ...partner.contacts
              .filter((c) => c.email)
              .map((c) => ({ id: c.id, name: c.name, email: c.email as string, role: c.role ?? undefined })),
          ]}
        />
      </div>

      {/* Products / expertise */}
      <PartnerProductsSection partnerId={partner.id} />

      {/* Entity Management Panel (Admin Only) */}
      {isAdmin && partner.owner && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Gerenciamento de Acesso</h2>
          <EntityManagementPanel
            entityType="partner"
            entityId={partner.id}
            entityName={partner.name}
            ownerId={partner.owner.id}
            ownerName={partner.owner.name}
            ownerEmail={partner.owner.email ?? undefined}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}
