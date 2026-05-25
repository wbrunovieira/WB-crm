import { backendFetch } from "@/lib/backend/client";
import { BotFlowsList } from "@/components/bot-flows/BotFlowsList";

export const metadata = { title: "Bot Flows WhatsApp | WB CRM" };

interface BotFlow {
  id: string;
  name: string;
  description?: string;
  instanceName: string;
  isActive: boolean;
  triggerType: string;
  triggerValue?: string;
  createdAt: string;
  nodes: unknown[];
  edges: unknown[];
}

async function getFlows(): Promise<BotFlow[]> {
  try {
    return await backendFetch<BotFlow[]>("/bot-flows");
  } catch {
    return [];
  }
}

export default async function BotFlowsPage() {
  const flows = await getFlows();
  return <BotFlowsList flows={flows} />;
}
