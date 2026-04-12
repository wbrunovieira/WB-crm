import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamRecordingFromS3 } from "@/lib/goto/s3-recording";

/**
 * GET /api/goto/recordings/[activityId]?track=agent|client
 *
 * Streams a GoTo call recording MP3 from S3 to the browser.
 * track=agent (default) → streams the agent track (gotoRecordingUrl)
 * track=client          → streams the client track (gotoRecordingUrl2)
 *
 * Requires authentication and activity ownership.
 * Supports Range headers for HTML5 audio player seeking.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { activityId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const track = req.nextUrl.searchParams.get("track") ?? "agent";

  const activity = await prisma.activity.findFirst({
    where: {
      id: params.activityId,
      ownerId: session.user.id,
    },
    select: { gotoRecordingUrl: true, gotoRecordingUrl2: true },
  });

  const s3Key = track === "client"
    ? activity?.gotoRecordingUrl2
    : activity?.gotoRecordingUrl;

  if (!s3Key) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  try {
    const { body, contentType, contentLength } = await streamRecordingFromS3(s3Key);

    if (!body) {
      return NextResponse.json({ error: "S3 stream unavailable" }, { status: 502 });
    }

    const webStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of body as AsyncIterable<Uint8Array>) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    };

    if (contentLength) {
      headers["Content-Length"] = String(contentLength);
    }

    return new NextResponse(webStream, { status: 200, headers });
  } catch (err) {
    console.error(`Recording proxy error for activity ${params.activityId}:`, err);
    return NextResponse.json({ error: "Failed to fetch recording" }, { status: 500 });
  }
}
