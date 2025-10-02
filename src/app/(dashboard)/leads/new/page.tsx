import { LeadForm } from "@/components/leads/LeadForm";

export default function NewLeadPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-200">Novo Lead</h1>
        <p className="mt-2 text-gray-400">
          Adicione um novo lead ao seu pipeline
        </p>
      </div>

      <LeadForm />
    </div>
  );
}
