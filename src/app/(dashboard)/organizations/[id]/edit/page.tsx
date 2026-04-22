import { backendFetch } from "@/lib/backend/client";
import type { Organization } from "@/types/organization";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import { notFound } from "next/navigation";

export default async function EditOrganizationPage({
  params,
}: {
  params: { id: string };
}) {
  const organization = await backendFetch<Organization>(`/organizations/${params.id}`).catch(() => null);

  if (!organization) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Editar Organização</h1>
        <p className="mt-2 text-gray-600">
          Atualize as informações da organização
        </p>
      </div>

      <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
        <OrganizationForm organization={organization} />
      </div>
    </div>
  );
}
