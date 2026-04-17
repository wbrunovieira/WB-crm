"use client";

import { useContact } from "@/hooks/contacts/use-contacts";
import { ContactForm } from "@/components/contacts/ContactForm";
import { notFound } from "next/navigation";

export default function EditContactPage({ params }: { params: { id: string } }) {
  const { data: contact, isLoading, isError } = useContact(params.id);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-5 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="max-w-2xl h-96 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (isError || !contact) notFound();

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
