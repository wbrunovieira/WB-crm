"use client";

import { useContact } from "@/hooks/contacts/use-contacts";
import ActivityTimeline from "@/components/activities/ActivityTimeline";
import { PhoneLink } from "@/components/ui/phone-link";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { WhatsAppCheckButton } from "@/components/whatsapp/WhatsAppCheckButton";
import GmailButton from "@/components/gmail/GmailButton";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";
import { LanguageBadges } from "@/components/shared/LanguageSelector";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  id: string;
  isAdmin: boolean;
}

export function ContactDetailClient({ id, isAdmin }: Props) {
  const { data: contact, isLoading, isError } = useContact(id);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (isError || !contact) {
    notFound();
  }

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
                    verified={
                      contact.whatsappVerifiedAt && contact.whatsappVerifiedNumber === contact.phone
                        ? { at: new Date(contact.whatsappVerifiedAt), number: contact.whatsappVerifiedNumber, exists: contact.whatsappVerified }
                        : undefined
                    }
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
                    verified={
                      contact.whatsappVerifiedAt && contact.whatsappVerifiedNumber === contact.whatsapp
                        ? { at: new Date(contact.whatsappVerifiedAt), number: contact.whatsappVerifiedNumber, exists: contact.whatsappVerified }
                        : undefined
                    }
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
              <dt className="text-sm font-medium text-gray-500">Criado em</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(contact.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Idiomas</dt>
              <dd className="mt-1">
                <LanguageBadges languages={contact.languages} />
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
                    <Link href={`/deals/${deal.id}`} className="text-primary hover:underline">
                      {deal.title}
                    </Link>
                    <span className="ml-2 text-gray-500">• {deal.stage.name}</span>
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
              <Link href={`/activities/new?contactId=${contact.id}`} className="text-sm text-primary hover:underline">
                + Nova Atividade
              </Link>
            </div>
            <ActivityTimeline
              activities={contact.activities.map((a) => ({
                ...a,
                whatsappMessages: a.whatsappMessages.map((m) => ({
                  ...m,
                  timestamp: new Date(m.timestamp),
                })),
              }))}
              showLinks={false}
            />
          </div>
        </div>
      </div>

      {isAdmin && contact.owner && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Proprietário</h2>
          <p className="text-sm text-gray-700">
            {contact.owner.name} — {contact.owner.email}
          </p>
        </div>
      )}
    </div>
  );
}
