import { getCampaigns } from "@/actions/campaigns";
import { CampaignsList } from "@/components/campaigns/CampaignsList";
import Link from "next/link";

export const metadata = { title: "Campanhas WhatsApp | WB CRM" };

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-200">Campanhas WhatsApp</h1>
          <p className="mt-2 text-gray-400">
            Crie e gerencie campanhas de envio em massa via WhatsApp
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          + Nova Campanha
        </Link>
      </div>

      <CampaignsList campaigns={campaigns} />
    </div>
  );
}
