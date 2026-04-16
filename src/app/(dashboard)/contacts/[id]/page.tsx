import { getContactById } from "@/actions/contacts";
import { getMeetings } from "@/actions/meetings";
import MeetingsList from "@/components/meetings/MeetingsList";
import { PhoneLink } from "@/components/ui/phone-link";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { WhatsAppCheckButton } from "@/components/whatsapp/WhatsAppCheckButton";
import GmailButton from "@/components/gmail/GmailButton";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";
import { EntityManagementPanel } from "@/components/shared/entity-management";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityTimeline from "@/components/activities/ActivityTimeline";
import { formatDate } from "@/lib/utils";
import { LanguageBadges } from "@/components/shared/LanguageSelector";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [contact, session, meetings] = await Promise.all([
    getContactById(params.id),
    getServerSession(authOptions),
    getMeetings({ contactId: params.id }),
  ]);

  if (!contact) {
    notFound();
  }

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{contact.name}</h1>
          <p className="mt-2 text-gray-600">Detalhes do contato</p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
          <DeleteContactButton contactId={contact.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                {contact.email ? (
                  <>
                    <a href={`mailto:${contact.email}`} className="hover:text-primary hover:underline">
                      {contact.email}
                    </a>
                    <GmailButton to={contact.email} name={contact.name} contactId={contact.id} variant="icon" />
                  </>
                ) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Telefone</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900 flex-wrap">
                <PhoneLink phone={contact.phone} className="text-gray-900 hover:text-primary" />
                {!contact.phone && "-"}
                {contact.phone && (
                  <WhatsAppCheckButton
                    phone={contact.phone}
                    entityType="contact"
                    entityId={contact.id}
                    canSave={!contact.whatsapp}
                  />
                )}
              </dd>
            </div>
            {contact.whatsapp && (
              <div>
                <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900 flex-wrap">
                  <span className="font-mono">{contact.whatsapp}</span>
                  <WhatsAppCheckButton
                    phone={contact.whatsapp}
                    entityType="contact"
                    entityId={contact.id}
                  />
                  <WhatsAppButton to={contact.whatsapp} name={contact.name} variant="icon" />
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Organização</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {contact.organization?.name || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Criado em
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(contact.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Idiomas</dt>
              <dd className="mt-1">
                <LanguageBadges languages={contact.languages as string | null} />
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">
              Negócios ({contact.deals.length})
            </h2>
            {contact.deals.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum negócio vinculado</p>
            ) : (
              <ul className="space-y-2">
                {contact.deals.map((deal) => (
                  <li key={deal.id} className="text-sm">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-primary hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <span className="ml-2 text-gray-500">
                      • {deal.stage.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Timeline de Atividades ({contact.activities.length})
              </h2>
              <Link
                href={`/activities/new?contactId=${contact.id}`}
                className="text-sm text-primary hover:underline"
              >
                + Nova Atividade
              </Link>
            </div>
            <ActivityTimeline
              activities={contact.activities}
              showLinks={false}
            />
          </div>
        </div>
      </div>

      {/* Meetings */}
      <div className="mt-6">
        <MeetingsList
          meetings={meetings}
          contactId={contact.id}
          suggestedContacts={
            contact.email
              ? [{ id: contact.id, name: contact.name, email: contact.email, role: contact.role ?? undefined }]
              : []
          }
        />
      </div>

      {/* Entity Management Panel (Admin Only) */}
      {isAdmin && contact.owner && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Gerenciamento de Acesso</h2>
          <EntityManagementPanel
            entityType="contact"
            entityId={contact.id}
            entityName={contact.name}
            ownerId={contact.owner.id}
            ownerName={contact.owner.name}
            ownerEmail={contact.owner.email}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}
