import { backendFetch } from "@/lib/backend/client";
import { BotFlowEditor } from "@/components/bot-flows/BotFlowEditor";
import { notFound } from "next/navigation";

export const metadata = { title: "Editor de Bot Flow | WB CRM" };

export default async function BotFlowEditorPage({ params }: { params: { id: string } }) {
  const flow = await backendFetch<unknown>(`/bot-flows/${params.id}`).catch(() => null);
  if (!flow) notFound();
  return <BotFlowEditor flow={flow as any} />;
}
