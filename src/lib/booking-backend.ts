/**
 * Where the SERVER should call the backend from.
 *
 * The booking pages used NEXT_PUBLIC_BACKEND_URL for their server-side fetch, which sends
 * the request out of the box to the public hostname and back in through Cloudflare and
 * nginx. Measured on the server: 0.6s to 2.0s and climbing, against 0.35s internally — and
 * it sometimes fails outright, never even reaching nginx. When it failed the page told the
 * visitor "this booking link is invalid or expired", which is false and costs a meeting.
 *
 * The browser still needs the public URL; only the server side uses this one.
 */
export const BACKEND_INTERNAL =
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3010";

export const BACKEND_PUBLIC =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3010";

/**
 * Fetches booking data for server rendering. Retries once, because a single blip should not
 * turn into "your link expired" for a lead who is trying to book, and logs the failure —
 * the previous silent catch is why the outage left no trace anywhere to diagnose.
 */
export async function fetchBooking<T>(path: string): Promise<T | null> {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const res = await fetch(`${BACKEND_INTERNAL}${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return (await res.json()) as T;
      console.error(
        `[booking] ${path} respondeu ${res.status} (tentativa ${tentativa}/2)`,
      );
    } catch (err) {
      console.error(
        `[booking] ${path} falhou (tentativa ${tentativa}/2): ${(err as Error).message}`,
      );
    }
  }
  return null;
}
