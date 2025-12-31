import Link from "next/link";
import { Mail, Phone, MessageCircle, Building2, Briefcase, Edit, Star } from "lucide-react";
import { DeleteContactButton } from "./DeleteContactButton";
import { OwnerBadge } from "@/components/shared/OwnerBadge";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  department: string | null;
  isPrimary: boolean;
  status: string;
  organization: { id: string; name: string } | null;
  lead: { id: string; businessName: string } | null;
  partner: { id: string; name: string } | null;
  owner?: { id: string; name: string } | null;
}

interface ContactCardProps {
  contact: Contact;
  showOwnerBadge?: boolean;
  currentUserId?: string;
}

export function ContactCard({ contact, showOwnerBadge, currentUserId }: ContactCardProps) {
  const companyName = contact.organization?.name || contact.lead?.businessName || contact.partner?.name;
  const companyLink = contact.organization
    ? `/organizations/${contact.organization.id}`
    : contact.lead
      ? `/leads/${contact.lead.id}`
      : contact.partner
        ? `/partners/${contact.partner.id}`
        : null;

  return (
    <div className="group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/contacts/${contact.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-primary truncate"
            >
              {contact.name}
            </Link>
            {contact.isPrimary && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" title="Contato principal" />
            )}
            {showOwnerBadge && contact.owner && (
              <OwnerBadge
                ownerName={contact.owner.name}
                isCurrentUser={contact.owner.id === currentUserId}
              />
            )}
            <span
              className={`ml-auto flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                contact.status === "active"
                  ? "bg-green-100 text-green-800"
                  : contact.status === "inactive"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {contact.status === "active" ? "Ativo" : contact.status === "inactive" ? "Inativo" : "Bounced"}
            </span>
          </div>

          <div className="space-y-1.5 text-sm text-gray-600">
            {contact.role && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{contact.role}</span>
                {contact.department && (
                  <span className="text-gray-400">• {contact.department}</span>
                )}
              </div>
            )}

            {companyName && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                {companyLink ? (
                  <Link
                    href={companyLink}
                    className="text-primary hover:underline truncate"
                  >
                    {companyName}
                  </Link>
                ) : (
                  <span className="truncate">{companyName}</span>
                )}
              </div>
            )}

            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-gray-600 hover:text-primary truncate"
                >
                  {contact.email}
                </a>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <a
                  href={`tel:${contact.phone}`}
                  className="text-gray-600 hover:text-primary"
                >
                  {contact.phone}
                </a>
              </div>
            )}

            {contact.whatsapp && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary"
                >
                  {contact.whatsapp}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-primary transition-colors"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <DeleteContactButton contactId={contact.id} />
        </div>
      </div>
    </div>
  );
}
