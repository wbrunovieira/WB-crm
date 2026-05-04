import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? "http://localhost:3010";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role?.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return NextResponse.redirect(`${PUBLIC_BACKEND_URL}/auth/goto`);
}
