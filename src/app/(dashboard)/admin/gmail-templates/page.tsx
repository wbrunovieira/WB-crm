import { backendFetch } from "@/lib/backend/client";
import type { GmailTemplate } from "@/types/gmail-template";
import { GmailTemplatesList } from "@/components/admin/GmailTemplatesList";
import { GmailTemplateForm } from "@/components/admin/GmailTemplateForm";
import Link from "next/link";

export default async function GmailTemplatesPage() {
  const templates = await backendFetch<GmailTemplate[]>("/email/templates").catch(() => [] as GmailTemplate[]);

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Templates de E-mail</h1>
        <p className="mt-2 text-gray-600">
          Crie templates reutilizáveis com variáveis dinâmicas como{" "}
          <code className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
            {"{{nome}}"}
          </code>
          ,{" "}
          <code className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
            {"{{empresa}}"}
          </code>{" "}
          e{" "}
          <code className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
            {"{{data}}"}
          </code>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Novo Template</h2>
            <GmailTemplateForm />
          </div>
        </div>

        <div className="lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">
            Templates ({templates.length})
          </h2>
          <GmailTemplatesList templates={templates} />
        </div>
      </div>
    </div>
  );
}
