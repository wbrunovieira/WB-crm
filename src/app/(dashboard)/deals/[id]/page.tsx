import { backendFetch } from "@/lib/backend/client";
import type { Deal } from "@/types/deal";
import ProposalsList from "@/components/proposals/ProposalsList";
import type { Proposal } from "@/components/proposals/ProposalsList";
import MeetingsList from "@/components/meetings/MeetingsList";
import type { Meeting } from "@/components/meetings/MeetingsList";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import DeleteDealButton from "@/components/deals/DeleteDealButton";
import ActivityTimeline from "@/components/activities/ActivityTimeline";
import { DealProductsSection } from "@/components/deals/DealProductsSection";
import { DealTechStackSection } from "@/components/deals/DealTechStackSection";
import { EntityManagementPanel } from "@/components/shared/entity-management";
import { DealStageSelect } from "@/components/deals/DealStageSelect";
import { DealStatusSelect } from "@/components/deals/DealStatusSelect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [deal, session, proposals, meetings] = await Promise.all([
    backendFetch<Deal>(`/deals/${params.id}`).catch(() => null),
    getServerSession(authOptions),
    backendFetch<Proposal[]>(`/proposals?dealId=${params.id}`).catch((): Proposal[] => []),
    backendFetch<Meeting[]>(`/meetings?dealId=${params.id}`).catch((): Meeting[] => []),
  ]);

  if (!deal) {
    notFound();
  }

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link href="/deals" className="text-gray-500 hover:text-gray-700">
            ← Voltar
          </Link>
        </div>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{deal.title}</h1>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-primary px-5 py-2.5 shadow-md">
              <span className="text-sm font-medium text-purple-200">Valor</span>
              <span className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(deal.value, deal.currency)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/deals/${deal.id}/edit`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Editar
            </Link>
            <DeleteDealButton dealId={deal.id} />
          </div>
        </div>
      </div>

      {deal.description && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold">Descrição</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{deal.description}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <DealStatusSelect
                  dealId={deal.id}
                  currentStatus={deal.status as "open" | "won" | "lost"}
                  dealData={{
                    title: deal.title,
                    value: deal.value,
                    currency: deal.currency,
                    stageId: deal.stageId,
                    contactId: deal.contactId,
                    organizationId: deal.organizationId,
                    expectedCloseDate: deal.expectedCloseDate,
                  }}
                />
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Estágio</dt>
              <dd className="mt-1">
                <DealStageSelect
                  dealId={deal.id}
                  currentStageId={deal.stageId}
                />
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Data Prevista de Fechamento
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(deal.expectedCloseDate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Data de Criação
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(deal.createdAt)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Responsável</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {deal.owner.name || deal.owner.email}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Contato & Organização</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Contato</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {deal.contact ? (
                  <Link
                    href={`/contacts/${deal.contact.id}`}
                    className="text-primary hover:underline"
                  >
                    {deal.contact.name}
                  </Link>
                ) : (
                  "Nenhum contato vinculado"
                )}
              </dd>
            </div>

            {deal.contact?.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`mailto:${deal.contact.email}`}
                    className="text-primary hover:underline"
                  >
                    {deal.contact.email}
                  </a>
                </dd>
              </div>
            )}

            {deal.contact?.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {deal.contact.phone}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500">Organização</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {deal.organization ? (
                  <Link
                    href={`/organizations/${deal.organization.id}`}
                    className="text-primary hover:underline"
                  >
                    {deal.organization.name}
                  </Link>
                ) : (
                  "Nenhuma organização vinculada"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Produtos do Deal */}
      <DealProductsSection dealId={deal.id} />

      {/* Tech Stack do Deal */}
      <DealTechStackSection dealId={deal.id} />

      {/* Proposals */}
      <div className="mt-6">
        <ProposalsList proposals={proposals} dealId={deal.id} />
      </div>

      {/* Meetings */}
      <div className="mt-6">
        <MeetingsList
          meetings={meetings}
          dealId={deal.id}
          suggestedContacts={
            deal.contact?.email
              ? [{ id: deal.contact.id, name: deal.contact.name, email: deal.contact.email, role: deal.contact.role }]
              : []
          }
        />
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Timeline ({deal.activities.length + (deal.stageHistory?.length || 0)})
          </h2>
          <Link
            href={`/activities/new?dealId=${deal.id}`}
            className="text-sm text-primary hover:underline"
          >
            + Nova Atividade
          </Link>
        </div>
        <ActivityTimeline activities={deal.activities} stageChanges={deal.stageHistory} showLinks={false} currentDealId={deal.id} />
      </div>

      {/* Entity Management Panel (Admin Only) */}
      {isAdmin && deal.owner && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Gerenciamento de Acesso</h2>
          <EntityManagementPanel
            entityType="deal"
            entityId={deal.id}
            entityName={deal.title}
            ownerId={deal.owner.id}
            ownerName={deal.owner.name}
            ownerEmail={deal.owner.email ?? undefined}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}
