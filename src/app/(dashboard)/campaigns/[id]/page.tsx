import { backendFetch } from "@/lib/backend/client";
import type { CampaignDetail as CampaignDetailType } from "@/types/campaign";
import { CampaignDetail } from "@/components/campaigns/CampaignDetail";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Campanha | WB CRM" };

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const campaign = await backendFetch<CampaignDetailType>(`/campaigns/${params.id}`).catch(() => null);
  if (!campaign) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/campaigns" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Campanhas
        </Link>
      </div>
      <CampaignDetail campaign={campaign} />
    </div>
  );
}
