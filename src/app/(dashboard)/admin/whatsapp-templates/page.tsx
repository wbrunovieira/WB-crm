import { backendFetch } from "@/lib/backend/client";
import { WhatsAppTemplatesList } from "@/components/admin/WhatsAppTemplatesList";
import { WhatsAppTemplateForm } from "@/components/admin/WhatsAppTemplateForm";
import Link from "next/link";

type Template = { id: string; name: string; text: string; category: string | null; active: boolean; createdAt: Date };

export default async function WhatsAppTemplatesPage() {
  const templates = await backendFetch<Template[]>("/whatsapp/templates");

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Templates de WhatsApp</h1>
        <p className="mt-2 text-gray-600">
          Mensagens pré-definidas para agilizar o atendimento
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Novo Template</h2>
            <WhatsAppTemplateForm />
          </div>
        </div>

        <div className="lg:col-span-2">
          <WhatsAppTemplatesList templates={templates} />
        </div>
      </div>
    </div>
  );
}
