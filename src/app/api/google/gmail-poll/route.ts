import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/internal-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const isInternal = isInternalRequest(req);

  if (!isInternal && (!session?.user || session.user.role !== "admin")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const token = session?.user?.accessToken;
  if (!token) {
    // NestJS cron handles periodic polling — no session needed here
    return NextResponse.json({ processed: 0, message: "NestJS cron handles Gmail polling" });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/email/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({ processed: 0 }));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Poll failed" }, { status: 500 });
  }
}
