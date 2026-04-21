import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = session.user.accessToken;

  const upstream = await fetch(`${BACKEND_URL}/notifications/stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Stream unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
