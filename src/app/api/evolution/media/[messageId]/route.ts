import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedClient } from "@/lib/google/auth";
import { google } from "googleapis";
import { Readable } from "stream";

/**
 * GET /api/evolution/media/[messageId]
 *
 * Serve o arquivo de mídia de um WhatsAppMessage diretamente do Google Drive.
 * Suporta ?inline=true para visualização inline (áudio, vídeo, imagem) vs download.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const message = await prisma.whatsAppMessage.findUnique({
    where: { id: params.messageId },
    select: {
      mediaDriveId: true,
      mediaMimeType: true,
      mediaLabel: true,
      ownerId: true,
    },
  });

  if (!message) {
    return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }
  if (!message.mediaDriveId) {
    return NextResponse.json({ error: "Mídia não disponível" }, { status: 404 });
  }
  if (session.user.role !== "admin" && message.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
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
