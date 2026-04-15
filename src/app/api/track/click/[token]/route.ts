import { NextRequest, NextResponse } from "next/server";
import { trackEmailClick } from "@/lib/email-tracking";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const dest = req.nextUrl.searchParams.get("dest");

  if (!dest) {
    return NextResponse.json({ error: "Destino não informado" }, { status: 400 });
  }

  try {
    await trackEmailClick(params.token);
  } catch {
    // Silently ignore — redireciona mesmo com token inválido
  }

  return new NextResponse(null, { status: 307, headers: { Location: dest } });
}
