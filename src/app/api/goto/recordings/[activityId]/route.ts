import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedClient } from "@/lib/google/auth";
import { google } from "googleapis";

/**
 * GET /api/goto/recordings/[activityId]
 *
 * Proxies the GoTo call recording audio from Google Drive to the browser.
 * Supports Range headers so the HTML5 <audio> player can seek within the file.
 *
 * Auth: requires valid user session.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { activityId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id: params.activityId,
      ownerId: session.user.id,
    },
    select: { gotoRecordingDriveId: true },
  });

  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!activity.gotoRecordingDriveId) {
    return NextResponse.json({ error: "Recording not available" }, { status: 404 });
  }

  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth });

    // Download file content from Drive
    const fileRes = await drive.files.get(
      { fileId: activity.gotoRecordingDriveId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(fileRes.data as ArrayBuffer);
    const totalLength = buffer.length;

    // Support Range header for audio seeking
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : totalLength - 1;
      const chunkLength = end - start + 1;

      return new NextResponse(buffer.subarray(start, end + 1), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${totalLength}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkLength),
          "Content-Type": "audio/mpeg",
        },
      });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(totalLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error(`Recording proxy error for activity ${params.activityId}:`, err);
    return NextResponse.json({ error: "Failed to fetch recording" }, { status: 500 });
  }
}
