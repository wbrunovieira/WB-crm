import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteToken } from "@/lib/google/token-store";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "google-disconnect" });

export async function POST() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role?.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    await deleteToken();
    log.info("Conta Google desconectada");
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Falha ao desconectar conta Google", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Falha ao desconectar" }, { status: 500 });
  }
}
