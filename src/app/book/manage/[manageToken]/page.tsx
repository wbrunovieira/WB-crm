import type { Metadata } from "next";
import { ManageClient } from "@/components/booking/ManageClient";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3010";

export const metadata: Metadata = { title: "Gerenciar agendamento — WB Digital Solutions" };

async function fetchManage(t: string) {
  try {
    const r = await fetch(`${BACKEND}/public/booking/manage/${encodeURIComponent(t)}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export default async function ManagePage({ params }: { params: { manageToken: string } }) {
  const data = await fetchManage(params.manageToken);
  return <ManageClient manageToken={params.manageToken} backend={BACKEND} initial={data} />;
}
