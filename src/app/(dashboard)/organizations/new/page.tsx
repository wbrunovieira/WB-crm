import { OrganizationForm } from "@/components/organizations/OrganizationForm";

export default function NewOrganizationPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-200">Nova Organização</h1>
        <p className="mt-2 text-gray-400">
          Adicione uma nova organização ao seu CRM
        </p>
      </div>

      <OrganizationForm />
    </div>
  );
}
