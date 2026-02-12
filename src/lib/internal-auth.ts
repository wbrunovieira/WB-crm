import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Check if request is from internal network (localhost)
 */
export function isInternalRequest(request: Request): boolean {
  // Check X-Forwarded-For header (when behind proxy)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (isLocalIP(firstIp)) {
      return true;
    }
  }

  // Check X-Real-IP header
  const realIp = request.headers.get("x-real-ip");
  if (realIp && isLocalIP(realIp)) {
    return true;
  }

  // Check host header for localhost
  const host = request.headers.get("host");
  if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
    return true;
  }

  // Check for internal API key (optional additional security)
  const apiKey = request.headers.get("x-internal-api-key");
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    return true;
  }

  // Check for webhook secret (for external services like Agent)
  const webhookSecret = request.headers.get("x-webhook-secret");
  if (webhookSecret && webhookSecret === process.env.WEBHOOK_SECRET) {
    return true;
  }

  return false;
}

function isLocalIP(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  );
}

/**
 * Get session or allow internal request
 * Returns session user or a default internal user for internal requests
 */
export async function getSessionOrInternal(request: Request): Promise<{
  user: { id: string; role: string };
  isInternal: boolean;
} | null> {
  // First check if it's an internal request
  if (isInternalRequest(request)) {
    // For internal requests, get the default admin user or first user
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true, role: true },
    });

    if (adminUser) {
      return {
        user: { id: adminUser.id, role: adminUser.role },
        isInternal: true,
      };
    }

    // Fallback to first user if no admin
    const firstUser = await prisma.user.findFirst({
      select: { id: true, role: true },
    });

    if (firstUser) {
      return {
        user: { id: firstUser.id, role: firstUser.role },
        isInternal: true,
      };
    }
  }

  // Otherwise, use normal session authentication
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      user: { id: session.user.id, role: session.user.role || "sdr" },
      isInternal: false,
    };
  }

  return null;
}
