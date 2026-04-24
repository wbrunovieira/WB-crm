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

  const hasCompanyInfo = !!(
    lead.companyOwner || lead.companySize || lead.revenue ||
    lead.employeesCount || lead.primaryActivity || lead.secondaryActivities ||
    lead.businessStatus || lead.equityCapital
  );
  const hasSocials = !!(lead.instagram || lead.linkedin || lead.facebook || lead.twitter || lead.tiktok);
  const hasGooglePlaces = !!(lead.googleId || lead.categories || lead.rating || lead.userRatingsTotal || lead.priceLevel || lead.types);
  const hasMeta = !!(lead.source || lead.searchTerm || lead.category || lead.radius);

  /* ── label styles ────────────────────────────────────── */
  const dtCls = "text-xs font-semibold uppercase tracking-wide text-purple-400 mb-0.5";
  const ddCls = "text-sm font-medium text-gray-300";

  return (
    <div className="min-h-screen bg-[#350045] p-4 md:p-8">

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
            <div>
              <dt className={dtCls}>Nome Comercial</dt>
              <dd className={ddCls}>{lead.businessName}</dd>
            </div>
            {lead.registeredName && (
              <div>
                <dt className={dtCls}>Razão Social</dt>
                <dd className={ddCls}>{lead.registeredName}</dd>
              </div>
            )}
            {lead.companyRegistrationID && (
              <div>
                <dt className={dtCls}>CNPJ</dt>
                <dd className="text-sm font-mono text-gray-300">{lead.companyRegistrationID}</dd>
              </div>
            )}
            {lead.foundationDate && (
              <div>
                <dt className={dtCls}>Fundação</dt>
                <dd className={ddCls}>{formatDate(lead.foundationDate)}</dd>
              </div>
            )}
            {lead.description && (
              <div>
                <dt className={dtCls}>Descrição</dt>
                <dd className="text-sm leading-relaxed text-gray-400">{lead.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Contato */}
        <div className="rounded-xl bg-white shadow-md border border-purple-900/40 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/40 pb-3">
            <Phone size={14} />
            Contato da Empresa
          </h2>
          <dl className="space-y-4">
            {lead.phone && (
              <div>
                <dt className={dtCls}>Telefone</dt>
                <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-300">
                  <PhoneLink phone={lead.phone} className="text-gray-300 hover:text-purple-300" />
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
                <dt className={dtCls}>WhatsApp</dt>
                <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-300">
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
                <dt className={dtCls}>Email</dt>
                <dd className="flex items-center gap-2 text-sm">
                  <a href={`mailto:${lead.email}`} className="font-medium text-purple-300 hover:text-purple-200 hover:underline">
                    {lead.email}
                  </a>
                  <GmailButton to={lead.email} name={lead.businessName} leadId={lead.id} variant="icon" />
                </dd>
              </div>
            )}
            {lead.website && (
              <div>
                <dt className={dtCls}>Website</dt>
                <dd className="text-sm">
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-purple-300 hover:text-purple-200 hover:underline"
                  >
                    <Globe size={12} className="text-purple-500 flex-shrink-0" />
                    {lead.website}
                  </a>
                </dd>
              </div>
            )}
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
            {lead.address   && <div><dt className={dtCls}>Endereço</dt>     <dd className={ddCls}>{lead.address}</dd></div>}
            {lead.vicinity  && <div><dt className={dtCls}>Bairro/Região</dt><dd className={ddCls}>{lead.vicinity}</dd></div>}
            {lead.city      && <div><dt className={dtCls}>Cidade</dt>       <dd className={ddCls}>{lead.city}</dd></div>}
            {lead.state     && <div><dt className={dtCls}>Estado</dt>       <dd className={ddCls}>{lead.state}</dd></div>}
            {lead.country   && <div><dt className={dtCls}>País</dt>         <dd className={ddCls}>{lead.country}</dd></div>}
            {lead.zipCode   && <div><dt className={dtCls}>CEP</dt>          <dd className="text-sm font-mono text-gray-300">{lead.zipCode}</dd></div>}
          </dl>
        </div>
      </div>

      {/* ── Collapsible sections ──────────────────────────────────────── */}

      {hasCompanyInfo && (
        <CollapsibleSection id="empresa" icon={<Building2 size={14} />} title="Informações da Empresa">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lead.companyOwner    && <div><dt className={dtCls}>Proprietário/CEO</dt><dd className={ddCls}>{lead.companyOwner}</dd></div>}
            {lead.companySize     && <div><dt className={dtCls}>Tamanho</dt>         <dd className={ddCls}>{lead.companySize}</dd></div>}
            {lead.employeesCount  && <div><dt className={dtCls}>Funcionários</dt>    <dd className={ddCls}>{lead.employeesCount}</dd></div>}
            {lead.revenue && (
              <div>
                <dt className={dtCls}>Receita Anual</dt>
                <dd className="text-sm font-semibold text-green-300">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.revenue)}
                </dd>
              </div>
            )}
            {lead.equityCapital && (
              <div>
                <dt className={dtCls}>Capital Social</dt>
                <dd className="text-sm font-semibold text-green-300">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.equityCapital)}
                </dd>
              </div>
            )}
            {lead.businessStatus  && <div><dt className={dtCls}>Status</dt>           <dd className={ddCls}>{lead.businessStatus}</dd></div>}
            {lead.primaryActivity && (
              <div className="md:col-span-2 lg:col-span-3">
                <dt className={dtCls}>Atividade Primária</dt>
                <dd className={ddCls}>{lead.primaryActivity}</dd>
              </div>
            )}
            {lead.secondaryActivities && (
              <div className="md:col-span-2 lg:col-span-3">
                <dt className={dtCls}>Atividades Secundárias</dt>
                <dd className="text-sm leading-relaxed text-gray-400">{lead.secondaryActivities}</dd>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {hasSocials && (
        <CollapsibleSection id="redes" icon={<Share2 size={14} />} title="Redes Sociais" defaultOpen={false}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "instagram", label: "Instagram", url: lead.instagram, base: "https://instagram.com/" },
              { key: "linkedin",  label: "LinkedIn",  url: lead.linkedin,  base: "https://linkedin.com/company/" },
              { key: "facebook",  label: "Facebook",  url: lead.facebook,  base: "https://facebook.com/" },
              { key: "twitter",   label: "Twitter/X", url: lead.twitter,   base: "https://twitter.com/" },
              { key: "tiktok",    label: "TikTok",    url: lead.tiktok,    base: "https://tiktok.com/@" },
            ]
              .filter((s) => s.url)
              .map((s) => (
                <div key={s.key}>
                  <dt className={dtCls}>{s.label}</dt>
                  <dd>
                    <a
                      href={s.url!.startsWith("http") ? s.url! : `${s.base}${s.url!.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-300 hover:text-purple-200 hover:underline"
                    >
                      <Globe size={12} className="text-purple-500 flex-shrink-0" />
                      {s.url}
                    </a>
                  </dd>
                </div>
              ))}
          </div>
        </CollapsibleSection>
      )}

      {hasGooglePlaces && (
        <CollapsibleSection id="google-places" icon={<Star size={14} />} title="Google Places" defaultOpen={false}>
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
            {lead.categories && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4 md:col-span-2 lg:col-span-4">
                <dt className={dtCls}>Categorias</dt>
                <dd className={ddCls + " mt-1"}>{lead.categories}</dd>
              </div>
            )}
            {lead.types && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4 md:col-span-2 lg:col-span-4">
                <dt className={dtCls}>Tipos</dt>
                <dd className="text-sm text-gray-400 mt-1">{lead.types}</dd>
              </div>
            )}
            {lead.googleId && (
              <div className="rounded-lg bg-purple-900/20 border border-purple-800/40 p-4 md:col-span-2 lg:col-span-4">
                <dt className={dtCls}>Google Places ID</dt>
                <dd className="text-xs font-mono text-gray-500 mt-1 break-all">{lead.googleId}</dd>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {hasMeta && (
        <CollapsibleSection id="metadados" icon={<Search size={14} />} title="Metadados de Busca" defaultOpen={false}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
