import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role?.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const token = session.user.accessToken ?? "";
  return NextResponse.redirect(`${BACKEND_URL}/google/auth?token=${encodeURIComponent(token)}`);
}
