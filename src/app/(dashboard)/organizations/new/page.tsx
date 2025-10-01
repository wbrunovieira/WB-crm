import { OrganizationForm } from "@/components/organizations/OrganizationForm";

export default function NewOrganizationPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nova Organização</h1>
        <p className="mt-2 text-gray-600">
          Adicione uma nova organização ao seu CRM
        </p>
      </div>

      <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
        <OrganizationForm />
      </div>
    </div>
  );
}
