import { getContactById } from "@/actions/contacts";
import { ContactForm } from "@/components/contacts/ContactForm";
import { notFound } from "next/navigation";

export default async function EditContactPage({
  params,
}: {
  params: { id: string };
}) {
  const contact = await getContactById(params.id);

  if (!contact) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Editar Contato</h1>
        <p className="mt-2 text-gray-600">Atualize as informações do contato</p>
      </div>

      <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
        <ContactForm contact={contact} />
      </div>
    </div>
  );
}
