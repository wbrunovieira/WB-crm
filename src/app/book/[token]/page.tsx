import type { Metadata } from "next";
import { BookingClient } from "@/components/booking/BookingClient";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3010";

async function fetchBooking(token: string) {
  try {
    const res = await fetch(`${BACKEND}/public/booking/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const data = await fetchBooking(params.token);
  const title = data?.bookingType?.name
    ? `Agende: ${data.bookingType.name} — WB Digital Solutions`
    : "Agendar uma reunião — WB Digital Solutions";
  const description = data?.lead?.name
    ? `${data.lead.name}, escolha o melhor horário para conversarmos. Rápido e sem compromisso.`
    : "Escolha o melhor horário para conversarmos. Rápido e sem compromisso.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "WB Digital Solutions" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BookPage({ params }: { params: { token: string } }) {
  const data = await fetchBooking(params.token);
  return <BookingClient token={params.token} backend={BACKEND} initial={data} />;
}
