import { backendFetch } from "@/lib/backend/client";
import { BotFlowEditor } from "@/components/bot-flows/BotFlowEditor";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";

export const metadata = { title: "Editor de Bot Flow | WB CRM" };

type BotFlow = ComponentProps<typeof BotFlowEditor>["flow"];

export default async function BotFlowEditorPage({ params }: { params: { id: string } }) {
  const flow = await backendFetch<BotFlow>(`/bot-flows/${params.id}`).catch(() => null);
  if (!flow) notFound();
  return <BotFlowEditor flow={flow} />;
}
