import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { backendFetch } from "@/lib/backend/client";
import { getAuthenticatedClient } from "@/lib/google/auth";
import { google } from "googleapis";
import { Readable } from "stream";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const proposal = await backendFetch<{ driveFileId: string | null; fileName: string | null; ownerId: string } | null>(
    `/proposals/${params.id}`
  ).catch(() => null);

  if (!proposal) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }
  if (!proposal.driveFileId) {
    return NextResponse.json({ error: "Arquivo não disponível" }, { status: 404 });
  }
  if (session.user.role !== "admin" && proposal.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth });

    const [metaRes, fileRes] = await Promise.all([
      drive.files.get({ fileId: proposal.driveFileId, fields: "mimeType,name,size" }),
      drive.files.get(
        { fileId: proposal.driveFileId, alt: "media" },
        { responseType: "stream" }
      ),
    ]);

    const mimeType = metaRes.data.mimeType ?? "application/octet-stream";
    const fileName = proposal.fileName ?? metaRes.data.name ?? "arquivo";

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
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("Erro ao baixar arquivo do Drive:", err);
    return NextResponse.json({ error: "Erro ao acessar arquivo" }, { status: 500 });
  }
}
