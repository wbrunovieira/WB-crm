import type { Metadata } from "next";
import { bodyFont as body, displayFont as display } from "@/lib/fonts/book";
import { BookingClient, type BookingData } from "@/components/booking/BookingClient";
import { BACKEND_PUBLIC, fetchBooking } from "@/lib/booking-backend";



// Busca interna, com retry e log: ver src/lib/booking-backend.ts para o porquê.
async function carregarAgendamento(token: string) {
  return fetchBooking<BookingData>(`/public/booking/${encodeURIComponent(token)}`);
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const data = await carregarAgendamento(params.token);
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
  const data = await carregarAgendamento(params.token);
  return (
    <main className={`${display.variable} ${body.variable}`}>
      <BookingClient token={params.token} backend={BACKEND_PUBLIC} initial={data} />
    </main>
  );
}
