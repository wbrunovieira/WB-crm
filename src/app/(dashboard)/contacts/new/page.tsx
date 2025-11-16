import { ContactForm } from "@/components/contacts/ContactForm";

export default function NewContactPage({
  searchParams,
}: {
  searchParams: { organizationId?: string; partnerId?: string; leadId?: string };
}) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Novo Contato</h1>
        <p className="mt-2 text-gray-600">
          Adicione um novo contato ao seu CRM
        </p>
      </div>

      <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
        <ContactForm
          preselectedOrganizationId={searchParams.organizationId}
          partnerId={searchParams.partnerId}
          leadId={searchParams.leadId}
        />
      </div>
    </div>
  );
}
