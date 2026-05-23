import { backendFetch } from "@/lib/backend/client";
import { EmailCampaignsView } from "@/components/email-campaigns/EmailCampaignsView";

export const metadata = { title: "Campanhas de Email | WB CRM" };

interface Campaign {
  id: string;
  name: string;
  description?: string;
  fromEmail: string;
  status: string;
  createdAt: string;
}

interface Suppression {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
}

async function getCampaigns(): Promise<Campaign[]> {
  try {
    return await backendFetch<Campaign[]>("/email-campaigns");
  } catch {
    return [];
  }
}

async function getSuppressions(): Promise<Suppression[]> {
  try {
    return await backendFetch<Suppression[]>("/email-campaigns/suppressions");
  } catch {
    return [];
  }
}

export default async function EmailCampaignsPage() {
  const [campaigns, suppressions] = await Promise.all([getCampaigns(), getSuppressions()]);

  return <EmailCampaignsView campaigns={campaigns} suppressions={suppressions} />;
}
