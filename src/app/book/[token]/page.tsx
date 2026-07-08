import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { BookingClient } from "@/components/booking/BookingClient";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

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
    ? `${data.bookingType.name} — WB Digital Solutions`
    : "Agende uma conversa — WB Digital Solutions";
  const description = data?.lead?.name
    ? `${data.lead.name}, escolha o melhor horário para a gente conversar — leva 1 minuto.`
    : "Escolha o melhor horário para a gente conversar — leva 1 minuto.";
  return {
    // Sem isto o Next resolve og:image contra http://localhost:3000 (default) e o
    // WhatsApp não consegue buscar a imagem. Aponta pro domínio público do agendamento.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_BOOKING_BASE_URL ?? "https://agenda.wbdigitalsolutions.com",
    ),
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "WB Digital Solutions" },
    // "summary" (não large): reforça o card COMPACTO no WhatsApp/Twitter.
    twitter: { card: "summary", title, description },
  };
}

export default async function BookPage({ params }: { params: { token: string } }) {
  const data = await fetchBooking(params.token);
  return (
    <main className={`${display.variable} ${body.variable}`}>
      <BookingClient token={params.token} backend={BACKEND} initial={data} />
    </main>
  );
}
