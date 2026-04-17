import { CampaignForm } from "@/components/campaigns/CampaignForm";
import Link from "next/link";

export const metadata = { title: "Nova Campanha | WB CRM" };

export default function NewCampaignPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/campaigns" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Campanhas
        </Link>
        <h1 className="text-3xl font-bold text-gray-200">Nova Campanha</h1>
        <p className="mt-2 text-gray-400">
          Configure sua campanha de envio em massa via WhatsApp
        </p>
      </div>

      <CampaignForm />
    </div>
  );
}
