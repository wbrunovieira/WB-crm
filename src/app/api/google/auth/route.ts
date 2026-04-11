import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role?.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
