import { API_URL } from "./config";
import { getToken } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

/**
 * Thin authenticated fetch against the NestJS backend. Attaches the embedded/stored JWT as
 * a Bearer token. Mirrors the web app's apiFetch in spirit. Throws ApiError on non-2xx.
 */
export async function apiFetch<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const token = await getToken();
  const { body, headers, ...rest } = opts;
  // FormData (multipart uploads): pass through as-is and let fetch set its own
  // Content-Type with the boundary — JSON.stringify-ing it would lose the file.
  const isFormData = body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(body === undefined || isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }

  const contentType = res.headers.get("content-type") ?? "";
  return (contentType.includes("application/json") ? await res.json() : await res.text()) as T;
}
