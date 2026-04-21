export function isInternalRequest(request: Request): boolean {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (isLocalIP(firstIp)) return true;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && isLocalIP(realIp)) return true;

  const host = request.headers.get("host");
  if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) return true;

  const apiKey = request.headers.get("x-internal-api-key");
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) return true;

  const webhookSecret = request.headers.get("x-webhook-secret");
  if (webhookSecret && webhookSecret === process.env.WEBHOOK_SECRET) return true;

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
