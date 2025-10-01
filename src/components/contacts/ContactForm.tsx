"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactFormData } from "@/lib/validations/contact";
import { createContact, updateContact } from "@/actions/contacts";

interface ContactFormProps {
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    organizationId: string | null;
  };
}

export function ContactForm({ contact }: ContactFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data: ContactFormData = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        organizationId: formData.get("organizationId") as string,
      };

      if (contact) {
        await updateContact(contact.id, data);
      } else {
        await createContact(data);
      }

      router.push("/contacts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contato");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Nome *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={contact?.name}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          defaultValue={contact?.email || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700"
        >
          Telefone
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          defaultValue={contact?.phone || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Salvando..." : contact ? "Atualizar" : "Criar"}
        </button>
      </div>
    </form>
  );
}
