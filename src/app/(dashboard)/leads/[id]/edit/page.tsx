import { getLeadById } from "@/actions/leads";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadTechProfileSection } from "@/components/leads/LeadTechProfileSection";
import { SecondaryCNAEsManager } from "@/components/shared/SecondaryCNAEsManager";
import { notFound } from "next/navigation";

export default async function EditLeadPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await getLeadById(params.id);

  if (!lead) {
    notFound();
  }

  if (lead.convertedAt) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-yellow-900 bg-opacity-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-200">
            Lead Já Convertido
          </h2>
          <p className="mt-2 text-yellow-300">
            Este lead já foi convertido em organização e não pode ser editado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-200">Editar Lead</h1>
        <p className="mt-2 text-gray-400">{lead.businessName}</p>
      </div>

      <LeadForm lead={lead} />

      {/* Secondary CNAEs */}
      <div className="mt-6 rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Atividades Secundárias (CNAEs)
        </h2>
        <SecondaryCNAEsManager entityId={lead.id} entityType="lead" />
      </div>

      {/* Tech Profile */}
      <LeadTechProfileSection leadId={lead.id} />
    </div>
  );
}
