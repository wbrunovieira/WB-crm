import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { onNotification, offNotification, type NotificationEvent } from "@/lib/event-bus";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Keepalive a cada 25s para não fechar a conexão
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 25_000);

      const listener = (event: NotificationEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // cliente desconectou
        }
      };

      onNotification(userId, listener);

      // Cleanup quando o cliente desconectar
      return () => {
        clearInterval(keepalive);
        offNotification(userId, listener);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // desativa buffer do nginx
    },
  });
}
