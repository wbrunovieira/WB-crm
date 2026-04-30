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
import { LeadEmailVerifyButton } from "@/components/leads/LeadEmailVerifyButton";
import { LeadPhoneVerifyButton } from "@/components/leads/LeadPhoneVerifyButton";
import { LeadMetaAdsButton } from "@/components/leads/LeadMetaAdsButton";
import { LeadMetaAdsInline } from "@/components/leads/LeadMetaAdsInline";
import { LeadGoogleAdsInline } from "@/components/leads/LeadGoogleAdsInline";
import { LeadDeepResearchButton } from "@/components/leads/LeadDeepResearchButton";
import { LeadFocusedResearchButton } from "@/components/leads/LeadFocusedResearchButton";
import { LeadGooglePlacesLinkButton } from "@/components/leads/LeadGooglePlacesLinkButton";
import { LeadWebsiteAlertToast } from "@/components/leads/LeadWebsiteAlertToast";
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
  BrainCircuit,
  Sparkles,
} from "lucide-react";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [lead, session, proposals, meetings, callAnalyses, meetAnalyses] = await Promise.all([
    backendFetch<Lead>(`/leads/${params.id}`).catch(() => null),
    getServerSession(authOptions),
    backendFetch<Proposal[]>(`/proposals?leadId=${params.id}`).catch((): Proposal[] => []),
    backendFetch<Meeting[]>(`/meetings?leadId=${params.id}`).catch((): Meeting[] => []),
    backendFetch<{ id: string; activityId: string; score: number | null; status: string }[]>("/call-analysis").catch(() => []),
    backendFetch<{ id: string; activityId: string; score: number | null; status: string }[]>("/meet-analysis").catch(() => []),
  ]);

  const callAnalysesMap = Object.fromEntries(
    callAnalyses.map((a) => [a.activityId, { id: a.id, score: a.score, status: a.status }])
  );

  const meetAnalysesMap = Object.fromEntries(
    meetAnalyses.map((a) => [a.activityId, { id: a.id, score: a.score, status: a.status }])
  );

  // Activity IDs whose linked Meeting has a transcript (toggle trigger visible)
  const meetTranscriptActivityIds = new Set(
    (meetings ?? []).filter((m) => m.transcriptText && m.activityId).map((m) => m.activityId!)
  );

  if (!lead) notFound();

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  const statusMap: Record<string, { label: string; cls: string }> = {
    new:           { label: "Novo",          cls: "bg-purple-900/40 text-purple-300 border border-purple-700" },
    contacted:     { label: "Contatado",     cls: "bg-blue-900/40 text-blue-300 border border-blue-700" },
    qualified:     { label: "Qualificado",   cls: "bg-green-900/40 text-green-300 border border-green-700" },
    disqualified:  { label: "Desqualificado",cls: "bg-red-900/40 text-red-300 border border-red-700" },
  };

  const qualityMap: Record<string, { label: string; cls: string }> = {
    hot:  { label: "Quente", cls: "bg-red-900/40 text-red-300 border border-red-700" },
    warm: { label: "Morno",  cls: "bg-orange-900/40 text-orange-300 border border-orange-700" },
    cold: { label: "Frio",   cls: "bg-blue-900/40 text-blue-300 border border-blue-700" },
  };

  const statusCfg  = statusMap[lead.status]  ?? statusMap.new;
  const qualityCfg = lead.quality ? qualityMap[lead.quality] : null;

  const hasMeta = !!(lead.source || lead.searchTerm || lead.category || lead.radius || lead.sourceGroup);
  const agentFields: string[] = (() => { try { return JSON.parse(lead.agentUpdatedFields ?? "[]") as string[]; } catch { return []; } })();
  const dash = <span className="text-gray-600">—</span>;

  // Extract _websiteAlert embedded in agentSummary as "[ALERTA] <text>\n\n<summary>"
  const rawSummary = lead.agentSummary ?? "";
  const websiteAlertMatch = rawSummary.match(/^\[ALERTA\] ([\s\S]+?)(?:\n\n|$)/);
  const websiteAlert = websiteAlertMatch?.[1]?.trim() ?? null;
  const cleanSummary = websiteAlert ? rawSummary.replace(/^\[ALERTA\] [\s\S]+?(\n\n|$)/, "").trim() || null : rawSummary || null;

  // Parses a field that may be a plain string or a JSON-serialized string[]
  function parseStringOrArray(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* plain string */ }
    return [value];
  }

  /* ── label styles ────────────────────────────────────── */
  const dtCls = "text-xs font-semibold uppercase tracking-wide text-purple-400 mb-0.5";
  const ddCls = "text-sm font-medium text-gray-300";
  const IaBadge = ({ field }: { field: string }) =>
    agentFields.includes(field) ? (
      <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-purple-800/60 border border-purple-600/50 px-1.5 py-0 text-[10px] font-semibold text-purple-300" title="Preenchido pelo agente IA">
        <Sparkles size={8} />IA
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-[#350045] p-4 md:p-8">
      {websiteAlert && <LeadWebsiteAlertToast leadId={lead.id} message={websiteAlert} />}

      {/* ── Header card ──────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-white shadow-lg border border-purple-900/40 p-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Title block */}
          <div className="flex-1 min-w-0">
            {/* Name — primary hierarchy */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
              {lead.businessName}
            </h1>

            {/* Badges row — secondary hierarchy, all xs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              {qualityCfg && (
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${qualityCfg.cls}`}>
                  {qualityCfg.label}
                </span>
              )}
              {lead.isArchived && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-900/40 text-amber-300 border border-amber-700 px-2 py-0.5 text-xs font-semibold">
                  Arquivado
                  {lead.archivedAt && (
                    <span className="font-normal opacity-80">
                      · {formatDate(lead.archivedAt)}
                      {lead.archivedReason && ` · ${lead.archivedReason}`}
                    </span>
                  )}
                </span>
              )}
              {lead.sourceGroup && (
                <span className="inline-flex items-center rounded-md bg-indigo-900/40 border border-indigo-600/50 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                  🏷 {lead.sourceGroup}
                </span>
              )}
              {lead.labels?.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: `${label.color}22`, color: label.color, border: `1px solid ${label.color}55` }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <LeadDeepResearchButton leadId={lead.id} hasResearch={!!lead.agentResearchAt} agentResearchAt={lead.agentResearchAt ? String(lead.agentResearchAt) : null} />
            <LeadFocusedResearchButton
              leadId={lead.id}
              agentResearchAt={lead.agentResearchAt ? String(lead.agentResearchAt) : null}
              lead={{
                instagram: lead.instagram,
                facebook: lead.facebook,
                linkedin: lead.linkedin,
                website: lead.website,
                email: lead.email,
                phone: lead.phone,
                phone2: lead.phone2,
                whatsapp: lead.whatsapp,
                companyRegistrationID: lead.companyRegistrationID,
                description: lead.description,
                companyOwner: lead.companyOwner,
                metaAds: lead.metaAds,
              }}
            />
            {!lead.convertedAt && (
              <>
                {!lead.isArchived && (
                  <>
                    <Link
                      href={`/leads/${lead.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
              >
                <Building2 size={14} />
                Ver Organização
              </Link>
            )}
          </div>
        </div>

        {/* Quick-nav — dark-safe pills */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-purple-900/40 pt-4">
          {[
            { href: "#contatos",  icon: <Users size={11} />,        label: "Contatos" },
            { href: "#atividades",icon: <Activity size={11} />,     label: "Atividades" },
            { href: "#reunioes",  icon: <Video size={11} />,        label: "Reuniões" },
            { href: "#propostas", icon: <FileText size={11} />,     label: "Propostas" },
            { href: "#produtos",  icon: <Package size={11} />,      label: "Produtos" },
            { href: "#tech",      icon: <Cpu size={11} />,          label: "Tech" },
            { href: "#cadencia",  icon: <CalendarClock size={11} />,label: "Cadência" },
            { href: "#cnae",      icon: <BarChart2 size={11} />,    label: "CNAE" },
          ].map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-1 rounded-full border border-purple-700/60 bg-purple-900/30 px-2.5 py-1 text-xs font-medium text-purple-300 hover:bg-purple-800/40 hover:text-purple-200 transition-colors"
            >
              {icon}
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Banners */}
      {lead.convertedAt && (
        <div className="mb-5 rounded-xl border border-green-700/60 bg-green-900/20 p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-300">
            <Building2 size={15} className="text-green-400" />
            Lead convertido em {formatDate(lead.convertedAt)}
          </p>
        </div>
      )}
      {lead.inOperationsAt && (
        <div className="mb-5 rounded-xl border border-amber-700/60 bg-amber-900/20 p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Activity size={15} className="text-amber-400" />
            In Operations desde {formatDate(lead.inOperationsAt)} — comunicações automáticas pausadas
          </p>
        </div>
      )}

      {/* ── 3-column grid ────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Informações Básicas */}
        <div className="rounded-xl bg-white shadow-md border border-purple-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/40 pb-3">
            <Building2 size={14} />
            Informações Básicas
          </h2>
          <dl className="space-y-4">
            <div><dt className={dtCls}>Nome Comercial</dt><dd className={ddCls}>{lead.businessName}</dd></div>
            <div><dt className={dtCls}>Razão Social</dt><dd className={ddCls}>{lead.registeredName || dash}</dd></div>
            <div><dt className={dtCls}>CNPJ</dt><dd className="text-sm font-mono text-gray-300">{lead.companyRegistrationID || dash}</dd></div>
            <div><dt className={dtCls}>Fundação</dt><dd className={ddCls}>{lead.foundationDate ? formatDate(lead.foundationDate) : dash}</dd></div>
            <div><dt className={dtCls}>Segmento</dt><dd className={ddCls}>{lead.segment || dash}</dd></div>
            <div><dt className={dtCls}>Descrição<IaBadge field="description" /></dt><dd className="text-sm leading-relaxed text-gray-400">{lead.description || dash}</dd></div>
          </dl>
        </div>

        {/* Contato */}
        <div className="rounded-xl bg-white shadow-md border border-purple-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/40 pb-3">
            <Phone size={14} />
            Contato da Empresa
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className={dtCls}>Telefone<IaBadge field="phone" /></dt>
              <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-300">
                {lead.phone ? (
                  <>
                    <PhoneLink phone={lead.phone} className="text-gray-300 hover:text-purple-300" />
                    <WhatsAppCheckButton phone={lead.phone} entityType="lead" entityId={lead.id} canSave={!lead.whatsapp} country={lead.country}
                      verified={lead.whatsappVerifiedAt && lead.whatsappVerifiedNumber === lead.phone
                        ? { at: lead.whatsappVerifiedAt, number: lead.whatsappVerifiedNumber, exists: lead.whatsappVerified ?? false }
                        : undefined} />
                    <LeadPhoneVerifyButton leadId={lead.id} phone={lead.phone} phone2={lead.phone2} whatsapp={lead.whatsapp} existing={{ phoneValid: lead.phoneValid ?? null, phoneType: lead.phoneType ?? null, phone2Valid: lead.phone2Valid ?? null, phone2Type: lead.phone2Type ?? null, whatsappPhoneValid: lead.whatsappPhoneValid ?? null, whatsappPhoneType: lead.whatsappPhoneType ?? null }} />
                  </>
                ) : dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Telefone 2</dt>
              <dd className="text-sm font-medium text-gray-300">{lead.phone2 ? <PhoneLink phone={lead.phone2} className="text-gray-300 hover:text-purple-300" /> : dash}</dd>
            </div>
            <div>
              <dt className={dtCls}>WhatsApp<IaBadge field="whatsapp" /></dt>
              <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-300">
                {lead.whatsapp ? (
                  <>
                    <span>{lead.whatsapp}</span>
                    <WhatsAppCheckButton phone={lead.whatsapp} entityType="lead" entityId={lead.id} country={lead.country}
                      verified={lead.whatsappVerifiedAt && lead.whatsappVerifiedNumber === lead.whatsapp
                        ? { at: lead.whatsappVerifiedAt, number: lead.whatsappVerifiedNumber, exists: lead.whatsappVerified ?? false }
                        : undefined} />
                    <WhatsAppButton to={lead.whatsapp} name={lead.businessName} variant="icon" leadId={lead.id} />
                  </>
                ) : dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Email<IaBadge field="email" /></dt>
              <dd className="flex flex-wrap items-center gap-2 text-sm">
                {lead.email ? (
                  <>
                    <a href={`mailto:${lead.email}`} className="font-medium text-purple-300 hover:text-purple-200 hover:underline">{lead.email}</a>
                    <GmailButton to={lead.email} name={lead.businessName} leadId={lead.id} variant="icon" />
                    <LeadEmailVerifyButton leadId={lead.id} email={lead.email}
                      verified={lead.emailVerifiedAt ? {
                        at: lead.emailVerifiedAt,
                        status: lead.emailVerificationStatus ?? "",
                        reason: lead.emailVerificationReason ?? "",
                        valid: lead.emailVerified ?? false,
                      } : undefined}
                    />
                  </>
                ) : dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Website<IaBadge field="website" /></dt>
              <dd className="text-sm">
                {lead.website ? (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-purple-300 hover:text-purple-200 hover:underline">
                    <Globe size={12} className="text-purple-500 flex-shrink-0" />
                    {lead.website}
                  </a>
                ) : dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Idiomas</dt>
              <dd className="mt-1"><LanguageBadges languages={lead.languages ?? null} /></dd>
            </div>
          </dl>
        </div>

        {/* Localização */}
        <div className="rounded-xl bg-white shadow-md border border-purple-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/40 pb-3">
            <MapPin size={14} />
            Localização
          </h2>
          <dl className="space-y-4">
            <div><dt className={dtCls}>Endereço</dt>     <dd className={ddCls}>{lead.address || dash}</dd></div>
            <div><dt className={dtCls}>Bairro/Região</dt><dd className={ddCls}>{lead.vicinity || dash}</dd></div>
            <div><dt className={dtCls}>Cidade</dt>       <dd className={ddCls}>{lead.city || dash}</dd></div>
            <div><dt className={dtCls}>Estado</dt>       <dd className={ddCls}>{lead.state || dash}</dd></div>
            <div><dt className={dtCls}>País</dt>         <dd className={ddCls}>{lead.country || dash}</dd></div>
            <div><dt className={dtCls}>CEP</dt>          <dd className="text-sm font-mono text-gray-300">{lead.zipCode || dash}</dd></div>
          </dl>
        </div>
      </div>

      {/* ── Collapsible sections ──────────────────────────────────────── */}

      <CollapsibleSection id="empresa" icon={<Building2 size={14} />} title="Informações da Empresa">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div><dt className={dtCls}>Proprietário/Sócio</dt><dd className={ddCls}>{lead.companyOwner || dash}</dd></div>
          <div><dt className={dtCls}>Porte</dt><dd className={ddCls}>{lead.companySize || dash}</dd></div>
          <div><dt className={dtCls}>Funcionários</dt><dd className={ddCls}>{lead.employeesCount ?? dash}</dd></div>
          <div>
            <dt className={dtCls}>Receita Anual</dt>
            <dd className="text-sm font-semibold text-green-300">
              {lead.revenue ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.revenue) : dash}
            </dd>
          </div>
          <div><dt className={dtCls}>Faixa de Faturamento</dt><dd className={ddCls}>{lead.revenueRange || dash}</dd></div>
          <div>
            <dt className={dtCls}>Capital Social</dt>
            <dd className="text-sm font-semibold text-green-300">
              {lead.equityCapital ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.equityCapital) : dash}
            </dd>
          </div>
          <div><dt className={dtCls}>Situação Cadastral</dt><dd className={ddCls}>{lead.businessStatus || dash}</dd></div>
          <div><dt className={dtCls}>Natureza Jurídica</dt><dd className={ddCls}>{lead.legalNature || dash}</dd></div>
          <div><dt className={dtCls}>Matriz / Filial</dt><dd className={ddCls}>{lead.branchType || dash}</dd></div>
          <div>
            <dt className={dtCls}>Simples Nacional</dt>
            <dd className={ddCls}>{lead.simplesNacional == null ? dash : lead.simplesNacional ? "Sim" : "Não"}</dd>
          </div>
          <div>
            <dt className={dtCls}>MEI</dt>
            <dd className={ddCls}>{lead.isMei == null ? dash : lead.isMei ? "Sim" : "Não"}</dd>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="redes" icon={<Share2 size={14} />} title="Redes Sociais" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className={dtCls}>Instagram<IaBadge field="instagram" /></dt>
            <dd className="flex flex-wrap items-center gap-2">
              {lead.instagram ? (
                <>
                  <a
                    href={lead.instagram.startsWith("http") ? lead.instagram : `https://instagram.com/${lead.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-purple-200 hover:underline"
                  >
                    <Globe size={12} className="text-purple-500 flex-shrink-0" />
                    {lead.instagram}
                  </a>
                  <LeadMetaAdsButton instagram={lead.instagram} businessName={lead.businessName} />
                </>
              ) : dash}
            </dd>
          </div>
          {[
            { key: "linkedin",  label: "LinkedIn",  url: lead.linkedin,  base: "https://linkedin.com/company/" },
            { key: "facebook",  label: "Facebook",  url: lead.facebook,  base: "https://facebook.com/" },
            { key: "twitter",   label: "Twitter/X", url: lead.twitter,   base: "https://twitter.com/" },
            { key: "tiktok",    label: "TikTok",    url: lead.tiktok,    base: "https://tiktok.com/@" },
          ].map((s) => (
            <div key={s.key}>
              <dt className={dtCls}>{s.label}<IaBadge field={s.key} /></dt>
              <dd>
                {s.url ? (
                  <a
                    href={s.url.startsWith("http") ? s.url : `${s.base}${s.url.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-purple-200 hover:underline"
                  >
                    <Globe size={12} className="text-purple-500 flex-shrink-0" />
                    {s.url}
                  </a>
                ) : dash}
              </dd>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="presenca-digital" icon={<Globe size={14} />} title="Presença Digital" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
            <dt className={dtCls}>Redes Sociais</dt>
            <dd className={`mt-1 ${lead.socialMedia ? ddCls : "text-sm text-gray-600"}`}>{lead.socialMedia || "—"}</dd>
          </div>
          <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
            <dt className={dtCls}>Meta Ads</dt>
            <dd className="mt-1">
              <LeadMetaAdsInline
                leadId={lead.id}
                instagram={lead.instagram}
                businessName={lead.businessName}
                existing={lead.metaAds ? (() => { try { return JSON.parse(lead.metaAds) as { hasAds: boolean; activeCount: number; checkedAt: string }; } catch { return null; } })() : null}
              />
            </dd>
          </div>
          <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
            <dt className={dtCls}>Google Ads</dt>
            <dd className="mt-1">
              <LeadGoogleAdsInline leadId={lead.id} existing={lead.googleAds} />
            </dd>
          </div>
        </div>
      </CollapsibleSection>

      {lead.agentResearchAt && (
        <CollapsibleSection id="agente-ia" icon={<BrainCircuit size={14} />} title="Pesquisa do Agente IA" defaultOpen>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <Sparkles size={12} />
              Última pesquisa: {formatDate(lead.agentResearchAt)}
              {agentFields.length > 0 && (
                <span className="ml-2 rounded-full bg-purple-900/60 border border-purple-600/50 px-2 py-0.5">
                  {agentFields.length} campo{agentFields.length !== 1 ? "s" : ""} preenchido{agentFields.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {cleanSummary && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-700/40 p-4">
                <dt className={dtCls + " mb-2"}>Resumo</dt>
                <dd className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">{cleanSummary}</dd>
              </div>
            )}
            {agentFields.length > 0 && (
              <div className="rounded-lg bg-purple-950/40 border border-purple-700/30 p-4">
                <dt className={dtCls + " mb-2"}>Campos preenchidos pelo agente</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {agentFields.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-purple-800/50 border border-purple-600/50 px-2.5 py-0.5 text-xs font-medium text-purple-200">
                      <Sparkles size={10} />
                      {f}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        id="google-places"
        icon={<Star size={14} />}
        title="Google Places"
        defaultOpen={false}
        action={<LeadGooglePlacesLinkButton lead={{
          id: lead.id,
          businessName: lead.businessName,
          registeredName: lead.registeredName ?? null,
          city: lead.city ?? null,
          address: lead.address ?? null,
          state: lead.state ?? null,
          zipCode: lead.zipCode ?? null,
          country: lead.country ?? null,
          phone: lead.phone ?? null,
          website: lead.website ?? null,
          rating: lead.rating ?? null,
          userRatingsTotal: lead.userRatingsTotal ?? null,
          priceLevel: lead.priceLevel ?? null,
          businessStatus: lead.businessStatus ?? null,
          categories: lead.categories ?? null,
          types: lead.types ?? null,
          latitude: lead.latitude ?? null,
          longitude: lead.longitude ?? null,
          googleMapsUrl: lead.googleMapsUrl ?? null,
          googleId: lead.googleId ?? null,
          description: lead.description ?? null,
          openingHours: lead.openingHours ?? null,
        }} />}
      >
        {!lead.googleId && !lead.rating && !lead.categories && !lead.userRatingsTotal && !lead.priceLevel && !lead.types ? (
          <p className="text-sm text-gray-500 italic">Nenhum dado do Google Places vinculado ainda.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {lead.rating && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
                <dt className={dtCls}>Avaliação</dt>
                <dd className="flex items-center gap-1.5 text-xl font-bold text-gray-200 mt-1">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                  {lead.rating.toFixed(1)}
                  <span className="text-xs font-normal text-gray-500">/ 5.0</span>
                </dd>
              </div>
            )}
            {lead.userRatingsTotal && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
                <dt className={dtCls}>Avaliações</dt>
                <dd className="text-xl font-bold text-purple-300 mt-1">{lead.userRatingsTotal}</dd>
              </div>
            )}
            {lead.priceLevel && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
                <dt className={dtCls}>Nível de Preço</dt>
                <dd className="text-sm font-bold text-green-300 mt-1">{"R$".repeat(lead.priceLevel)}</dd>
              </div>
            )}
            {lead.categories && (() => {
              const cats = parseStringOrArray(lead.categories);
              return (
                <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4 md:col-span-2 lg:col-span-4">
                  <dt className={dtCls}>Categorias</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {cats.map((c) => (
                      <span key={c} className="inline-block rounded-full bg-purple-800/50 border border-purple-600/50 px-2.5 py-0.5 text-xs font-medium text-purple-200">{c}</span>
                    ))}
                  </dd>
                </div>
              );
            })()}
            {lead.types && (() => {
              const types = parseStringOrArray(lead.types);
              return (
                <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4 md:col-span-2 lg:col-span-4">
                  <dt className={dtCls}>Tipos</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {types.map((t) => (
                      <span key={t} className="inline-block rounded-full bg-gray-800/60 border border-gray-600/40 px-2.5 py-0.5 text-xs text-gray-400">{t}</span>
                    ))}
                  </dd>
                </div>
              );
            })()}
            {lead.googleId && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4 md:col-span-2 lg:col-span-4">
                <dt className={dtCls}>Google Places ID</dt>
                <dd className="text-xs font-mono text-gray-500 mt-1 break-all">{lead.googleId}</dd>
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {hasMeta && (
        <CollapsibleSection id="metadados" icon={<Search size={14} />} title="Metadados de Busca" defaultOpen={false}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {lead.sourceGroup && (
              <div className="rounded-lg bg-indigo-900/30 border border-indigo-600/50 p-4">
                <dt className={dtCls}>Lote / Grupo</dt>
                <dd className="text-sm font-mono font-semibold text-indigo-300 mt-1">{lead.sourceGroup}</dd>
              </div>
            )}
            {lead.source && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
                <dt className={dtCls}>Fonte</dt>
                <dd className={ddCls + " mt-1"}>{lead.source}</dd>
              </div>
            )}
            {lead.searchTerm && (
              <div className="rounded-lg bg-purple-800/20 border border-purple-600/40 p-4">
                <dt className={dtCls}>Termo de Busca</dt>
                <dd className="text-sm font-semibold text-purple-200 mt-1">&quot;{lead.searchTerm}&quot;</dd>
              </div>
            )}
            {lead.category && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
                <dt className={dtCls}>Categoria</dt>
                <dd className={ddCls + " mt-1"}>{lead.category}</dd>
              </div>
            )}
            {lead.radius && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
                <dt className={dtCls}>Raio de Busca</dt>
                <dd className={ddCls + " mt-1"}>{lead.radius} km</dd>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {isAdmin && lead.owner && (
        <CollapsibleSection id="acesso" icon={<ShieldCheck size={14} />} title="Gerenciamento de Acesso" defaultOpen={false}>
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

      {/* ── Client sections ───────────────────────────────────────────── */}

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
        <CollapsibleSection id="cnae" icon={<BarChart2 size={14} />} title="Atividades Econômicas (CNAE)">
          {lead.primaryCNAE && (
            <div className="mb-5 rounded-lg bg-purple-900/30 border border-purple-700/60 p-4">
              <dt className={dtCls + " mb-2"}>Atividade Primária</dt>
              <dd className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-purple-200 bg-purple-900/60 border border-purple-600/50 px-2.5 py-1 rounded-md">
                  {lead.primaryCNAE.code}
                </span>
                <span className="text-sm font-medium text-gray-300">
                  {lead.primaryCNAE.description}
                </span>
              </dd>
            </div>
          )}
          {lead.internationalActivity && (
            <div className="mb-5 rounded-lg bg-purple-900/20 border border-purple-800/40 p-4">
              <dt className={dtCls + " mb-1"}>Atividade Internacional</dt>
              <dd className={ddCls}>{lead.internationalActivity}</dd>
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
          callAnalysesMap={callAnalysesMap}
          meetAnalysesMap={meetAnalysesMap}
          meetTranscriptActivityIds={meetTranscriptActivityIds}
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
