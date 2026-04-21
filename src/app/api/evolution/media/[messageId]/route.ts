import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/google/auth";
import { google } from "googleapis";
import { Readable } from "stream";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function GET(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const token = session.user.accessToken;
  if (!token) {
    return NextResponse.json({ error: "Sem token de acesso" }, { status: 401 });
  }

  const msgRes = await fetch(`${BACKEND_URL}/whatsapp/message/${params.messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!msgRes.ok) {
    const status = msgRes.status === 404 ? 404 : msgRes.status === 403 ? 403 : 500;
    return NextResponse.json({ error: "Mensagem não encontrada" }, { status });
  }

  const message = await msgRes.json() as { mediaDriveId: string | null; mediaMimeType: string | null; mediaLabel: string | null };

  if (!message.mediaDriveId) {
    return NextResponse.json({ error: "Mídia não disponível" }, { status: 404 });
  }

  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth });

    const [metaRes, fileRes] = await Promise.all([
      drive.files.get({ fileId: message.mediaDriveId, fields: "mimeType,name,size" }),
      drive.files.get(
        { fileId: message.mediaDriveId, alt: "media" },
        { responseType: "stream" }
      ),
    ]);

    const mimeType = message.mediaMimeType ?? metaRes.data.mimeType ?? "application/octet-stream";
    const fileName = metaRes.data.name ?? "media";

    const inline = req.nextUrl.searchParams.get("inline") === "true";
    const disposition = inline
      ? `inline; filename="${encodeURIComponent(fileName)}"`
      : `attachment; filename="${encodeURIComponent(fileName)}"`;

    const nodeStream = fileRes.data as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() { nodeStream.destroy(); },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Erro ao baixar mídia WhatsApp do Drive:", err);
    return NextResponse.json({ error: "Erro ao acessar arquivo" }, { status: 500 });
  }
}
