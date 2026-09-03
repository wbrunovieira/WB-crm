import { backendFetch } from "@/lib/backend/client";
import type { Organization } from "@/types/organization";
import MeetingsList from "@/components/meetings/MeetingsList";
import type { Meeting } from "@/components/meetings/MeetingsList";
import GmailButton from "@/components/gmail/GmailButton";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import GmailSyncButton from "@/components/gmail/GmailSyncButton";
import { PhoneLink } from "@/components/ui/phone-link";
import { DeleteOrganizationButton } from "@/components/organizations/DeleteOrganizationButton";
import { OrganizationProjects } from "@/components/organizations/OrganizationProjects";
import { OrganizationActivities } from "@/components/organizations/OrganizationActivities";
import { OrganizationTechProfileSection } from "@/components/organizations/OrganizationTechProfileSection";
import { OrganizationICPSection } from "@/components/icps/OrganizationICPSection";
import { OrganizationSectorSection } from "@/components/sectors/OrganizationSectorSection";
import { SecondaryCNAEsManager } from "@/components/shared/SecondaryCNAEsManager";
import { EntityManagementPanel } from "@/components/shared/entity-management";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OrganizationContactsList } from "@/components/organizations/OrganizationContactsList";
import Link from "next/link";
import { Building2, MapPin, Share2, Globe, BarChart2, ShieldCheck, Users, TrendingUp, Video, Activity, FileText, BrainCircuit } from "lucide-react";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { LanguageBadges } from "@/components/shared/LanguageSelector";

export default async function OrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [organization, session, meetings] = await Promise.all([
    backendFetch<Organization>(`/organizations/${params.id}`).catch(() => null),
    getServerSession(authOptions),
    backendFetch<Meeting[]>(`/meetings?organizationId=${params.id}`).catch((): Meeting[] => []),
  ]);

  if (!organization) {
    notFound();
  }

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  // Mesmas constantes da página do lead (leads/[id]/page.tsx:132,151-152), para os dois
  // lados escreverem rótulo, valor e vazio do mesmo jeito.
  const dtCls = "text-xs font-semibold uppercase tracking-wide text-purple-400 mb-0.5";
  const ddCls = "text-sm font-medium text-gray-300";
  const dash = <span className="text-gray-600">—</span>;

  return (
    <div className="min-h-screen bg-[#350045] p-4 md:p-8">
      {/* Header sticky no molde da página do lead (leads/[id]/page.tsx:165-296): identidade,
          badges e ações sempre visíveis, com a navegação por âncoras abaixo. */}
      <div className="sticky top-16 z-40 mb-6 rounded-2xl border border-purple-900/40 bg-white px-4 py-4 shadow-lg md:px-6 md:py-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="mb-2 break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl md:text-3xl">
                {organization.name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-md border border-green-600/50 bg-green-900/40 px-2 py-0.5 text-xs font-semibold text-green-300">
                  Cliente
                </span>
                {organization.sourceGroup && (
                  <span className="inline-flex items-center rounded-md border border-indigo-600/50 bg-indigo-900/40 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                    🏷 {organization.sourceGroup}
                  </span>
                )}
                {organization.labels?.map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${label.color}22`,
                      color: label.color,
                      border: `1px solid ${label.color}55`,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Link
                href={`/organizations/${organization.id}/edit`}
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
              >
                Editar
              </Link>
              <DeleteOrganizationButton organizationId={organization.id} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-purple-900/40 pt-4">
            {[
              { href: "#info-basica", icon: <Building2 size={11} />, label: "Informações" },
              { href: "#contatos", icon: <Users size={11} />, label: "Contatos" },
              { href: "#negocios", icon: <TrendingUp size={11} />, label: "Negócios" },
              { href: "#reunioes", icon: <Video size={11} />, label: "Reuniões" },
              { href: "#atividades", icon: <Activity size={11} />, label: "Atividades" },
              { href: "#projetos", icon: <FileText size={11} />, label: "Projetos" },
              { href: "#tech", icon: <BrainCircuit size={11} />, label: "Tecnologia" },
              { href: "#cnae", icon: <BarChart2 size={11} />, label: "CNAE" },
            ].map(({ href, icon, label }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1 rounded-full border border-purple-700/60 bg-purple-900/30 px-2.5 py-1 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-800/40 hover:text-purple-200"
              >
                {icon}
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {organization.convertedAt && (
        <div className="mb-4 rounded-lg border border-green-700/60 bg-green-900/20 p-3 text-sm">
          <span className="font-semibold text-green-300">Cliente desde</span>{" "}
          <span className="text-green-200">{formatDate(organization.convertedAt)}</span>
          {organization.sourceLeadId && (
            // O histórico de prospecção (GPS, Google Places, verificações) não tem coluna na
            // Organization e segue vivendo no lead — este é o caminho até ele.
            <Link
              href={`/leads/${organization.sourceLeadId}`}
              className="ml-2 text-xs text-purple-300 hover:text-purple-200 hover:underline"
            >
              ver lead de origem →
            </Link>
          )}
        </div>
      )}

      {organization.inOperationsAt && (
        <div className="mb-6 rounded-lg border border-amber-700/60 bg-amber-900/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-amber-300">Em operação</span>
            <span className="text-amber-200">desde {formatDate(organization.inOperationsAt)}</span>
            <span className="text-sm text-amber-400">
              — comunicações automáticas pausadas
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Information */}
        <div id="info-basica" className="rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
          <h2 className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
            <Building2 size={14} />
            Informações Básicas
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className={dtCls}>Nome Fantasia</dt>
              <dd className={ddCls}>
                {organization.name}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Razão Social</dt>
              <dd className={ddCls}>
                {organization.legalName || dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Website</dt>
              <dd className={ddCls}>
                {organization.website ? (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 hover:underline"
                  >
                    <Globe size={12} />
                    {organization.website}
                  </a>
                ) : (
                  dash
                )}
              </dd>
            </div>
            {organization.email && (
              <div>
                <dt className={dtCls}>Email</dt>
                <dd className={`flex items-center gap-2 ${ddCls}`}>
                  <a href={`mailto:${organization.email}`} className="hover:text-primary hover:underline">
                    {organization.email}
                  </a>
                  <GmailButton
                    to={organization.email}
                    name={organization.name}
                    organizationId={organization.id}
                    variant="icon"
                  />
                </dd>
              </div>
            )}
            <div>
              <dt className={dtCls}>Telefone</dt>
              <dd className={ddCls}>
                <PhoneLink phone={organization.phone} className="text-gray-300 hover:text-purple-200" />
                {!organization.phone && dash}
              </dd>
            </div>
            {organization.whatsapp && (
              <div>
                <dt className={dtCls}>WhatsApp</dt>
                <dd className={`flex items-center gap-2 ${ddCls}`}>
                  <PhoneLink phone={organization.whatsapp} className="text-gray-300 hover:text-purple-200" />
                  <WhatsAppButton
                    to={organization.whatsapp}
                    name={organization.name}
                    organizationId={organization.id}
                    variant="icon"
                  />
                </dd>
              </div>
            )}
            {organization.phone2 && (
              <div>
                <dt className={dtCls}>Telefone 2</dt>
                <dd className={ddCls}>
                  <PhoneLink phone={organization.phone2} className="text-gray-300 hover:text-purple-200" />
                </dd>
              </div>
            )}
            <div>
              <dt className={dtCls}>Setor</dt>
              <dd className={ddCls}>
                {organization.industry || dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>CNPJ</dt>
              <dd className={`font-mono ${ddCls}`}>
                {organization.taxId || "—"}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Fundação</dt>
              <dd className={ddCls}>
                {organization.foundationDate ? formatDate(organization.foundationDate) : dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Criado em</dt>
              <dd className={ddCls}>
                {formatDate(organization.createdAt)}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Idiomas</dt>
              <dd className="mt-1"><LanguageBadges languages={organization.languages ?? null} /></dd>
            </div>
          </dl>
        </div>

        {/* Location */}
        <div className="rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
          <h2 className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
            <MapPin size={14} />
            Localização
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className={dtCls}>Endereço</dt>
              <dd className={ddCls}>
                {organization.streetAddress || dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Cidade</dt>
              <dd className={ddCls}>
                {organization.city || dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>Estado</dt>
              <dd className={ddCls}>
                {organization.state || dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>CEP</dt>
              <dd className={ddCls}>
                {organization.zipCode ? <span className="font-mono">{organization.zipCode}</span> : dash}
              </dd>
            </div>
            <div>
              <dt className={dtCls}>País</dt>
              <dd className={ddCls}>
                {organization.country || dash}
              </dd>
            </div>
          </dl>
        </div>

        {/* Business Info & Social */}
        <div className="space-y-6">
          <div className="rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
            <h2 className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
              <Building2 size={14} />
              Informações de Negócio
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className={dtCls}>Proprietário/Sócio</dt>
                <dd className={ddCls}>{organization.companyOwner || dash}</dd>
              </div>
              <div>
                <dt className={dtCls}>Porte</dt>
                <dd className={ddCls}>{organization.companySize || dash}</dd>
              </div>
              <div>
                <dt className={dtCls}>
                  Funcionários
                </dt>
                <dd className={ddCls}>
                  {organization.employeeCount || dash}
                </dd>
              </div>
              <div>
                <dt className={dtCls}>
                  Receita Anual
                </dt>
                <dd className="text-sm font-semibold text-green-300">
                  {/* Intl, como no lead — a concatenação manual perdia os centavos. */}
                  {organization.annualRevenue
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        organization.annualRevenue,
                      )
                    : "—"}
                </dd>
              </div>
              {organization.revenueRange && (
                <div>
                  <dt className={dtCls}>Faixa de Faturamento</dt>
                  <dd className={ddCls}>{organization.revenueRange}</dd>
                </div>
              )}
              {organization.segment && (
                <div>
                  <dt className={dtCls}>Segmento Comercial</dt>
                  <dd className={ddCls}>{organization.segment}</dd>
                </div>
              )}
              {organization.legalNature && (
                <div>
                  <dt className={dtCls}>Natureza Jurídica</dt>
                  <dd className={ddCls}>{organization.legalNature}</dd>
                </div>
              )}
              {organization.branchType && (
                <div>
                  <dt className={dtCls}>Matriz / Filial</dt>
                  {/* Valor cru, como o lead faz: os dados reais incluem "Matriz", "Filial" e
                      até "EPP". Comparar com uma string fixa exibia "Filial" para todos. */}
                  <dd className={ddCls}>{organization.branchType}</dd>
                </div>
              )}
              {(organization.simplesNacional || organization.isMei) && (
                <div>
                  <dt className={dtCls}>Regime</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5 text-sm">
                    {organization.simplesNacional && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Simples Nacional
                      </span>
                    )}
                    {organization.isMei && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        MEI
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {organization.sourceGroup && (
                <div>
                  <dt className={dtCls}>Lote / Grupo</dt>
                  <dd className={ddCls}>{organization.sourceGroup}</dd>
                </div>
              )}
              {organization.description && (
                <div>
                  <dt className={dtCls}>
                    Descrição
                  </dt>
                  <dd className={ddCls}>
                    {organization.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Hospedagem: editável no formulário, filtrável na listagem e cobrada no widget de
              renovações do dashboard — e, até aqui, invisível na página do cliente. */}
          {organization.hasHosting && (
            <div className="rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
              <h2 className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
            <Globe size={14} />
            Hospedagem
          </h2>
              <dl className="space-y-4">
                {organization.hostingPlan && (
                  <div>
                    <dt className={dtCls}>Plano</dt>
                    <dd className={ddCls}>{organization.hostingPlan}</dd>
                  </div>
                )}
                {organization.hostingRenewalDate && (
                  <div>
                    <dt className={dtCls}>Renovação</dt>
                    <dd className={ddCls}>
                      {formatDate(organization.hostingRenewalDate)}
                      <span className="ml-2 text-xs text-gray-500">
                        (lembrete {organization.hostingReminderDays} dias antes)
                      </span>
                    </dd>
                  </div>
                )}
                {organization.hostingValue != null && (
                  <div>
                    <dt className={dtCls}>Valor</dt>
                    <dd className={ddCls}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        organization.hostingValue,
                      )}
                    </dd>
                  </div>
                )}
                {organization.hostingNotes && (
                  <div>
                    <dt className={dtCls}>Observações</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                      {organization.hostingNotes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
            <h2 className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
            <Share2 size={14} />
            Redes Sociais
          </h2>
            <dl className="space-y-4">
              {/* Mesmo padrão do lead: sempre exibe os 5, com link normalizado quando o valor
                  é um handle em vez de URL completa. Antes era texto puro, sem TikTok. */}
              {[
                { key: "instagram", label: "Instagram", base: "https://instagram.com/" },
                { key: "linkedin", label: "LinkedIn", base: "https://linkedin.com/company/" },
                { key: "facebook", label: "Facebook", base: "https://facebook.com/" },
                { key: "twitter", label: "Twitter/X", base: "https://twitter.com/" },
                { key: "tiktok", label: "TikTok", base: "https://tiktok.com/@" },
              ].map(({ key, label, base }) => {
                const value = organization[key as "instagram" | "linkedin" | "facebook" | "twitter" | "tiktok"];
                const href = value
                  ? value.startsWith("http")
                    ? value
                    : `${base}${value.replace(/^@/, "")}`
                  : null;
                return (
                  <div key={key}>
                    <dt className={dtCls}>{label}</dt>
                    <dd className={ddCls}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 hover:underline"
                        >
                          <Globe size={12} />
                          {value}
                        </a>
                      ) : (
                        dash
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>

      {/* Contacts, Deals, and Projects */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div id="contatos" className="scroll-mt-32" />
        <OrganizationContactsList
          organizationId={organization.id}
          contacts={organization.contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            whatsapp: c.whatsapp,
            role: c.role,
            isPrimary: c.isPrimary,
            status: c.status,
            languages: c.languages,
          }))}
        />

        <div id="negocios" className="scroll-mt-32 rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between border-b border-purple-900/40 pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Negócios ({organization.deals.length})
            </h2>
            <Link
              href={`/deals/new?organizationId=${organization.id}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              + Novo Negócio
            </Link>
          </div>
          {organization.deals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-purple-900/40 p-8 text-center">
              <p className="text-sm text-gray-500 mb-3">Nenhum negócio vinculado</p>
              <Link
                href={`/deals/new?organizationId=${organization.id}`}
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Criar Primeiro Negócio
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {organization.deals.map((deal) => (
                <li key={deal.id} className="text-sm">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="font-medium text-gray-100 hover:text-purple-200 hover:underline"
                  >
                    {deal.title}
                  </Link>
                  <span className="ml-2 text-gray-400">
                    {deal.stage?.pipeline?.name ? `• ${deal.stage.pipeline.name} › ` : "• "}
                    {deal.stage?.name ? `${deal.stage.name} • ` : ""}
                    {/* Intl com a moeda do próprio negócio, como no lead — antes era
                        "R$" concatenado à mão, ignorando currency e os centavos. */}
                    {deal.value != null
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: deal.currency || "BRL",
                        }).format(deal.value)
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tech Profile */}
      <div className="mt-6">
        <div id="tech" className="scroll-mt-32" />
        <OrganizationTechProfileSection organizationId={organization.id} />
      </div>

      {/* Sector Section */}
      <div className="mt-6">
        <OrganizationSectorSection organizationId={organization.id} />
      </div>

      {/* ICP Section */}
      <div className="mt-6">
        <OrganizationICPSection organizationId={organization.id} />
      </div>

      <div id="cnae" className="scroll-mt-32" />
      {/* CNAE Management */}
      <div className="mt-6 rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
        <h2 className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
            <BarChart2 size={14} />
            Atividades Econômicas (CNAE)
          </h2>
        {organization.primaryCNAE && (
          <div className="mb-6 rounded-lg border border-purple-500/40 bg-purple-900/30 p-4">
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-300">
              Atividade Primária
            </dt>
            <dd className="flex items-center gap-3">
              <span className="rounded-md bg-purple-950/60 px-3 py-1 font-mono text-sm font-bold text-purple-200">
                {organization.primaryCNAE.code}
              </span>
              <span className="text-base font-medium text-gray-100">
                {organization.primaryCNAE.description}
              </span>
            </dd>
          </div>
        )}
        {organization.internationalActivity && (
          <div className="mb-6 rounded-lg border border-blue-500/40 bg-blue-900/30 p-4">
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-300">
              Atividade Internacional
            </dt>
            <dd className="text-base font-medium text-gray-100">
              {organization.internationalActivity}
            </dd>
          </div>
        )}
        <div className="mt-6">
          <SecondaryCNAEsManager
            entityId={organization.id}
            entityType="organization"
          />
        </div>
      </div>

      {/* Meetings */}
      <div className="mt-6">
        <div id="reunioes" className="scroll-mt-32" />
        <MeetingsList
          meetings={meetings}
          organizationId={organization.id}
          suggestedContacts={[
            ...(organization.email
              ? [{ id: `org-${organization.id}`, name: organization.name, email: organization.email, role: "Empresa" }]
              : []),
            ...organization.contacts
              .filter((c) => c.email)
              .map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email!,
                role: undefined,
              })),
          ]}
        />
      </div>

      {/* Activities */}
      <div className="mt-6">
        <div className="mb-3 flex justify-end">
          <GmailSyncButton revalidateUrl={`/organizations/${organization.id}`} />
        </div>
        <div id="atividades" className="scroll-mt-32" />
        <OrganizationActivities
          activities={organization.activities}
          organizationId={organization.id}
        />
      </div>

      {/* Projects */}
      <div className="mt-6">
        <div id="projetos" className="scroll-mt-32" />
        <OrganizationProjects
          projectIds={
            organization.externalProjectIds
              ? JSON.parse(organization.externalProjectIds)
              : []
          }
        />
      </div>

      {/* Entity Management Panel (Admin Only) */}
      {isAdmin && organization.owner && (
        <div className="mt-6 rounded-xl border border-purple-900/40 bg-white p-5 shadow-md">
          <h2 className="mb-4 flex items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
            <ShieldCheck size={14} />
            Gerenciamento de Acesso
          </h2>
          <EntityManagementPanel
            entityType="organization"
            entityId={organization.id}
            entityName={organization.name}
            ownerId={organization.owner.id}
            ownerName={organization.owner.name}
            ownerEmail={organization.owner.email ?? undefined}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}
