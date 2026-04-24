import { backendFetch } from "@/lib/backend/client";
import type { Lead } from "@/types/lead";
import ProposalsList from "@/components/proposals/ProposalsList";
import type { Proposal } from "@/components/proposals/ProposalsList";
import MeetingsList from "@/components/meetings/MeetingsList";
import type { Meeting } from "@/components/meetings/MeetingsList";
import { PhoneLink } from "@/components/ui/phone-link";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { WhatsAppCheckButton } from "@/components/whatsapp/WhatsAppCheckButton";
import GmailButton from "@/components/gmail/GmailButton";
import GmailSyncButton from "@/components/gmail/GmailSyncButton";
import { ConvertLeadButton } from "@/components/leads/ConvertLeadButton";
import { DeleteLeadButton } from "@/components/leads/DeleteLeadButton";
import { ArchiveLeadButton } from "@/components/leads/ArchiveLeadButton";
import { LeadContactsList } from "@/components/leads/LeadContactsList";
import { LeadActivitiesList } from "@/components/leads/LeadActivitiesList";
import { LeadProductsSection } from "@/components/leads/LeadProductsSection";
import { LeadTechProfileSection } from "@/components/leads/LeadTechProfileSection";
import { LeadICPSection } from "@/components/icps/LeadICPSection";
import { LeadSectorSection } from "@/components/sectors/LeadSectorSection";
import { LeadCadenceSection } from "@/components/leads/LeadCadenceSection";
import { SecondaryCNAEsManager } from "@/components/shared/SecondaryCNAEsManager";
import { EntityManagementPanel } from "@/components/shared/entity-management";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { LanguageBadges } from "@/components/shared/LanguageSelector";
import {
  Building2,
  Phone,
  MapPin,
  Share2,
  Star,
  Search,
  ShieldCheck,
  Package,
  Cpu,
  Layers,
  Target,
  CalendarClock,
  BarChart2,
  Users,
  FileText,
  Video,
  Activity,
  Pencil,
  Globe,
} from "lucide-react";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [lead, session, proposals, meetings] = await Promise.all([
    backendFetch<Lead>(`/leads/${params.id}`).catch(() => null),
    getServerSession(authOptions),
    backendFetch<Proposal[]>(`/proposals?leadId=${params.id}`).catch((): Proposal[] => []),
    backendFetch<Meeting[]>(`/meetings?leadId=${params.id}`).catch((): Meeting[] => []),
  ]);

  if (!lead) {
    notFound();
  }

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  const statusLabels: Record<string, string> = {
    new: "Novo",
    contacted: "Contatado",
    qualified: "Qualificado",
    disqualified: "Desqualificado",
  };

  const qualityColors: Record<string, string> = {
    hot: "bg-red-100 text-red-700 border border-red-200",
    warm: "bg-orange-100 text-orange-700 border border-orange-200",
    cold: "bg-blue-100 text-blue-700 border border-blue-200",
  };
  const qualityLabels: Record<string, string> = { cold: "Frio", warm: "Morno", hot: "Quente" };

  const hasCompanyInfo = !!(
    lead.companyOwner || lead.companySize || lead.revenue ||
    lead.employeesCount || lead.primaryActivity || lead.secondaryActivities ||
    lead.businessStatus || lead.equityCapital
  );
  const hasSocials = !!(
    lead.instagram || lead.linkedin || lead.facebook || lead.twitter || lead.tiktok
  );
  const hasGooglePlaces = !!(
    lead.googleId || lead.categories || lead.rating || lead.userRatingsTotal || lead.priceLevel || lead.types
  );
  const hasMeta = !!(lead.source || lead.searchTerm || lead.category || lead.radius);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#792990] via-[#8b3fa3] to-[#6a1b7a] p-4 md:p-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Title + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                {lead.businessName}
              </h1>
              {lead.quality && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${qualityColors[lead.quality]}`}>
                  {qualityLabels[lead.quality]}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-semibold ${
                lead.status === "qualified" ? "bg-green-100 text-green-800 border border-green-200"
                  : lead.status === "contacted" ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : lead.status === "disqualified" ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200"
              }`}>
                {statusLabels[lead.status]}
              </span>
              {lead.isArchived && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 border border-amber-200 text-sm font-semibold text-amber-800">
                  Arquivado
                  {lead.archivedAt && (
                    <span className="font-normal text-amber-600 text-xs">
                      em {formatDate(lead.archivedAt)}
                      {lead.archivedReason && ` · ${lead.archivedReason}`}
                    </span>
                  )}
                </span>
              )}
              {lead.labels?.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${label.color}18`, color: label.color, border: `1.5px solid ${label.color}40` }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {!lead.convertedAt && (
              <>
                {!lead.isArchived && (
                  <>
                    <Link
                      href={`/leads/${lead.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 transition-colors"
                    >
                      <Pencil size={14} />
                      Editar
                    </Link>
                    <ConvertLeadButton leadId={lead.id} hasContacts={(lead.leadContacts?.length ?? 0) > 0} />
                  </>
                )}
                <ArchiveLeadButton leadId={lead.id} isArchived={lead.isArchived} />
                <DeleteLeadButton leadId={lead.id} />
              </>
            )}
            {lead.convertedAt && lead.convertedOrganization && (
              <Link
                href={`/organizations/${lead.convertedOrganization.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                <Building2 size={14} />
                Ver Organização
              </Link>
            )}
          </div>
        </div>

        {/* Quick-nav anchors */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-4">
          {[
            { href: "#contatos", icon: <Users size={12} />, label: "Contatos" },
            { href: "#atividades", icon: <Activity size={12} />, label: "Atividades" },
            { href: "#reunioes", icon: <Video size={12} />, label: "Reuniões" },
            { href: "#propostas", icon: <FileText size={12} />, label: "Propostas" },
            { href: "#produtos", icon: <Package size={12} />, label: "Produtos" },
            { href: "#tech", icon: <Cpu size={12} />, label: "Tech" },
            { href: "#cadencia", icon: <CalendarClock size={12} />, label: "Cadência" },
            { href: "#cnae", icon: <BarChart2 size={12} />, label: "CNAE" },
          ].map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
            >
              {icon}
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Conversion / In-ops banners */}
      {lead.convertedAt && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
            <Building2 size={16} className="text-green-600" />
            Lead convertido em {formatDate(lead.convertedAt)}
          </p>
        </div>
      )}
      {lead.inOperationsAt && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Activity size={16} className="text-amber-600" />
            In Operations desde {formatDate(lead.inOperationsAt)} — comunicações automáticas pausadas
          </p>
        </div>
      )}

      {/* ── Top 3-column grid ───────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Informações Básicas */}
        <div className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary border-b border-purple-100 pb-3">
            <Building2 size={16} />
            Informações Básicas
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Nome Comercial</dt>
              <dd className="text-sm font-medium text-gray-900">{lead.businessName}</dd>
            </div>
            {lead.registeredName && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Razão Social</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.registeredName}</dd>
              </div>
            )}
            {lead.companyRegistrationID && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">CNPJ</dt>
                <dd className="text-sm font-mono text-gray-900">{lead.companyRegistrationID}</dd>
              </div>
            )}
            {lead.foundationDate && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Fundação</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDate(lead.foundationDate)}</dd>
              </div>
            )}
            {lead.description && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Descrição</dt>
                <dd className="text-sm leading-relaxed text-gray-700">{lead.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Contato */}
        <div className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary border-b border-purple-100 pb-3">
            <Phone size={16} />
            Contato da Empresa
          </h2>
          <dl className="space-y-4">
            {lead.phone && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Telefone</dt>
                <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                  <PhoneLink phone={lead.phone} className="text-gray-900 hover:text-primary" />
                  <WhatsAppCheckButton
                    phone={lead.phone}
                    entityType="lead"
                    entityId={lead.id}
                    canSave={!lead.whatsapp}
                    verified={lead.whatsappVerifiedAt && lead.whatsappVerifiedNumber === lead.phone
                      ? { at: lead.whatsappVerifiedAt, number: lead.whatsappVerifiedNumber, exists: lead.whatsappVerified ?? false }
                      : undefined}
                  />
                </dd>
              </div>
            )}
            {lead.whatsapp && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">WhatsApp</dt>
                <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                  <span>{lead.whatsapp}</span>
                  <WhatsAppCheckButton
                    phone={lead.whatsapp}
                    entityType="lead"
                    entityId={lead.id}
                    verified={lead.whatsappVerifiedAt && lead.whatsappVerifiedNumber === lead.whatsapp
                      ? { at: lead.whatsappVerifiedAt, number: lead.whatsappVerifiedNumber, exists: lead.whatsappVerified ?? false }
                      : undefined}
                  />
                  <WhatsAppButton to={lead.whatsapp} name={lead.businessName} variant="icon" leadId={lead.id} />
                </dd>
              </div>
            )}
            {lead.email && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Email</dt>
                <dd className="flex items-center gap-2 text-sm text-gray-900">
                  <a href={`mailto:${lead.email}`} className="font-medium hover:text-primary hover:underline">
                    {lead.email}
                  </a>
                  <GmailButton to={lead.email} name={lead.businessName} leadId={lead.id} variant="icon" />
                </dd>
              </div>
            )}
            {lead.website && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Website</dt>
                <dd className="text-sm">
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-gray-900 hover:text-primary hover:underline"
                  >
                    <Globe size={13} className="text-gray-400" />
                    {lead.website}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Idiomas</dt>
              <dd><LanguageBadges languages={lead.languages ?? null} /></dd>
            </div>
          </dl>
        </div>

        {/* Localização */}
        <div className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary border-b border-purple-100 pb-3">
            <MapPin size={16} />
            Localização
          </h2>
          <dl className="space-y-4">
            {lead.address && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Endereço</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.address}</dd>
              </div>
            )}
            {lead.vicinity && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Bairro/Região</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.vicinity}</dd>
              </div>
            )}
            {lead.city && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Cidade</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.city}</dd>
              </div>
            )}
            {lead.state && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Estado</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.state}</dd>
              </div>
            )}
            {lead.country && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">País</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.country}</dd>
              </div>
            )}
            {lead.zipCode && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">CEP</dt>
                <dd className="text-sm font-mono text-gray-900">{lead.zipCode}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* ── Collapsible secondary sections ─────────────────────────── */}

      {hasCompanyInfo && (
        <CollapsibleSection
          id="empresa"
          icon={<Building2 size={16} />}
          title="Informações da Empresa"
          defaultOpen
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lead.companyOwner && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Proprietário/CEO</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.companyOwner}</dd>
              </div>
            )}
            {lead.companySize && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Tamanho</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.companySize}</dd>
              </div>
            )}
            {lead.employeesCount && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Funcionários</dt>
                <dd className="text-sm font-semibold text-gray-900">{lead.employeesCount}</dd>
              </div>
            )}
            {lead.revenue && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Receita Anual</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.revenue)}
                </dd>
              </div>
            )}
            {lead.equityCapital && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Capital Social</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.equityCapital)}
                </dd>
              </div>
            )}
            {lead.businessStatus && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Status do Negócio</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.businessStatus}</dd>
              </div>
            )}
            {lead.primaryActivity && (
              <div className="md:col-span-2 lg:col-span-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Atividade Primária</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.primaryActivity}</dd>
              </div>
            )}
            {lead.secondaryActivities && (
              <div className="md:col-span-2 lg:col-span-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Atividades Secundárias</dt>
                <dd className="text-sm leading-relaxed text-gray-700">{lead.secondaryActivities}</dd>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {hasSocials && (
        <CollapsibleSection
          id="redes"
          icon={<Share2 size={16} />}
          title="Redes Sociais"
          defaultOpen={false}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "instagram", label: "Instagram", url: lead.instagram, base: "https://instagram.com/" },
              { key: "linkedin", label: "LinkedIn", url: lead.linkedin, base: "https://linkedin.com/company/" },
              { key: "facebook", label: "Facebook", url: lead.facebook, base: "https://facebook.com/" },
              { key: "twitter", label: "Twitter/X", url: lead.twitter, base: "https://twitter.com/" },
              { key: "tiktok", label: "TikTok", url: lead.tiktok, base: "https://tiktok.com/@" },
            ]
              .filter((s) => s.url)
              .map((s) => (
                <div key={s.key}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{s.label}</dt>
                  <dd>
                    <a
                      href={s.url!.startsWith("http") ? s.url! : `${s.base}${s.url!.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary hover:underline"
                    >
                      <Globe size={13} className="text-gray-400 flex-shrink-0" />
                      {s.url}
                    </a>
                  </dd>
                </div>
              ))}
          </div>
        </CollapsibleSection>
      )}

      {hasGooglePlaces && (
        <CollapsibleSection
          id="google-places"
          icon={<Star size={16} />}
          title="Google Places"
          defaultOpen={false}
          accentColor="gray"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {lead.rating && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Avaliação</dt>
                <dd className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                  <Star size={18} className="text-amber-400 fill-amber-400" />
                  {lead.rating.toFixed(1)}
                  <span className="text-xs font-normal text-gray-400">/ 5.0</span>
                </dd>
              </div>
            )}
            {lead.userRatingsTotal && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Avaliações</dt>
                <dd className="text-xl font-bold text-primary">{lead.userRatingsTotal}</dd>
              </div>
            )}
            {lead.priceLevel && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Nível de Preço</dt>
                <dd className="text-sm font-bold text-gray-900">{"R$".repeat(lead.priceLevel)}</dd>
              </div>
            )}
            {lead.categories && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 md:col-span-2 lg:col-span-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Categorias</dt>
                <dd className="text-sm font-medium text-gray-900">{lead.categories}</dd>
              </div>
            )}
            {lead.types && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 md:col-span-2 lg:col-span-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Tipos</dt>
                <dd className="text-sm text-gray-700">{lead.types}</dd>
              </div>
            )}
            {lead.googleId && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 md:col-span-2 lg:col-span-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Google Places ID</dt>
                <dd className="text-xs font-mono text-gray-500 break-all">{lead.googleId}</dd>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {hasMeta && (
        <CollapsibleSection
          id="metadados"
          icon={<Search size={16} />}
          title="Metadados de Busca"
          defaultOpen={false}
          accentColor="gray"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {lead.source && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Fonte</dt>
                <dd className="text-sm font-semibold text-gray-900">{lead.source}</dd>
              </div>
            )}
            {lead.searchTerm && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">Termo de Busca</dt>
                <dd className="text-sm font-semibold text-purple-900">&quot;{lead.searchTerm}&quot;</dd>
              </div>
            )}
            {lead.category && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Categoria</dt>
                <dd className="text-sm font-semibold text-gray-900">{lead.category}</dd>
              </div>
            )}
            {lead.radius && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Raio de Busca</dt>
                <dd className="text-sm font-semibold text-gray-900">{lead.radius} km</dd>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {isAdmin && lead.owner && (
        <CollapsibleSection
          id="acesso"
          icon={<ShieldCheck size={16} />}
          title="Gerenciamento de Acesso"
          defaultOpen={false}
          accentColor="gray"
        >
          <EntityManagementPanel
            entityType="lead"
            entityId={lead.id}
            entityName={lead.businessName}
            ownerId={lead.owner.id}
            ownerName={lead.owner.name}
            ownerEmail={lead.owner.email ?? undefined}
            isAdmin={isAdmin}
          />
        </CollapsibleSection>
      )}

      {/* ── Client sections (own collapse internally or always visible) ── */}

      <div id="produtos" className="mt-6">
        <LeadProductsSection leadId={lead.id} isConverted={!!lead.convertedAt} />
      </div>

      <div id="tech" className="mt-6">
        <LeadTechProfileSection leadId={lead.id} />
      </div>

      <div id="setor" className="mt-6">
        <LeadSectorSection leadId={lead.id} isConverted={!!lead.convertedAt} />
      </div>

      <div id="icp" className="mt-6">
        <LeadICPSection leadId={lead.id} isConverted={!!lead.convertedAt} />
      </div>

      <div id="cadencia" className="mt-6">
        <LeadCadenceSection leadId={lead.id} isConverted={!!lead.convertedAt} />
      </div>

      {!lead.convertedAt && (
        <CollapsibleSection
          id="cnae"
          icon={<BarChart2 size={16} />}
          title="Atividades Econômicas (CNAE)"
          defaultOpen
        >
          {lead.primaryCNAE && (
            <div className="mb-5 rounded-lg bg-purple-50 border border-purple-200 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-2">
                Atividade Primária
              </dt>
              <dd className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-purple-900 bg-white px-2.5 py-1 rounded-md shadow-sm border border-purple-100">
                  {lead.primaryCNAE.code}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {lead.primaryCNAE.description}
                </span>
              </dd>
            </div>
          )}
          {lead.internationalActivity && (
            <div className="mb-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Atividade Internacional
              </dt>
              <dd className="text-sm font-medium text-gray-900">{lead.internationalActivity}</dd>
            </div>
          )}
          <SecondaryCNAEsManager entityId={lead.id} entityType="lead" />
        </CollapsibleSection>
      )}

      <div id="contatos" className="mt-6">
        <LeadContactsList
          leadId={lead.id}
          leadContacts={lead.leadContacts ?? []}
          isConverted={!!lead.convertedAt}
        />
      </div>

      <div id="propostas" className="mt-6">
        <ProposalsList proposals={proposals ?? []} leadId={lead.id} />
      </div>

      <div id="reunioes" className="mt-6">
        <MeetingsList
          meetings={meetings ?? []}
          leadId={lead.id}
          suggestedContacts={[
            ...(lead.email
              ? [{ id: `lead-${lead.id}`, name: lead.businessName, email: lead.email, role: "Empresa" }]
              : []),
            ...(lead.leadContacts ?? [])
              .filter((c) => c.email && c.isActive !== false)
              .map((c) => ({ id: c.id, name: c.name, email: c.email!, role: c.role })),
          ]}
        />
      </div>

      <div id="atividades" className="mt-6 mb-8">
        <div className="mb-3 flex justify-end">
          <GmailSyncButton revalidateUrl={`/leads/${lead.id}`} />
        </div>
        <LeadActivitiesList
          leadId={lead.id}
          activities={lead.activities ?? []}
          activityOrder={lead.activityOrder ?? null}
          leadContacts={(lead.leadContacts ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role ?? null,
            isPrimary: c.isPrimary ?? false,
            isActive: c.isActive ?? true,
          }))}
        />
      </div>
    </div>
  );
}
