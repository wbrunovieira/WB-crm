import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/**
 * Shared singleton so non-component code (e.g. the outbox drain logic) can invalidate queries
 * without importing from `app/`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't waste a retry on auth failures — a bad/expired token won't fix itself.
      retry: (failureCount, error) =>
        error instanceof ApiError && (error.status === 401 || error.status === 403) ? false : failureCount < 1,
    },
  },
});
