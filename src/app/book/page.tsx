import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { BookingClient, type BookingData } from "@/components/booking/BookingClient";
import { BACKEND_PUBLIC, fetchBooking } from "@/lib/booking-backend";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

// Token-less generic booking page (agenda.wbdigitalsolutions.com/book): resolves the
// default public link server-side, so a lead can book without an assigned token.
async function fetchDefaultBooking() {
  return fetchBooking<BookingData>("/public/booking");
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Agende uma conversa — WB Digital Solutions";
  const description = "Escolha o melhor horário para a gente conversar — leva 1 minuto.";
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_BOOKING_BASE_URL ?? "https://agenda.wbdigitalsolutions.com",
    ),
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "WB Digital Solutions" },
    twitter: { card: "summary", title, description },
  };
}

export default async function BookIndexPage() {
  const data = await fetchDefaultBooking();
  return (
    <main className={`${display.variable} ${body.variable}`}>
      <BookingClient backend={BACKEND_PUBLIC} initial={data} />
    </main>
  );
}
