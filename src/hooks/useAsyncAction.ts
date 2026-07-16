"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseAsyncActionOptions<TResult> {
  /** Toast shown on success (omit for no toast). */
  successMessage?: string;
  /** Fallback message when the thrown error has none. */
  errorMessage?: string;
  /** Show a Sonner error toast on failure. Default false — many call-sites render the error inline. */
  toastOnError?: boolean;
  onSuccess?: (result: TResult) => void;
  onError?: (error: unknown) => void;
}

interface UseAsyncActionReturn<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Wraps the ubiquitous `loading → try/catch → (toast) → error` pattern so
 * components don't hand-roll it. Returns `run` (never throws — resolves to
 * `undefined` on failure and exposes the message via `error`).
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {},
): UseAsyncActionReturn<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await action(...args);
        if (options.successMessage) toast.success(options.successMessage);
        options.onSuccess?.(result);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : options.errorMessage ?? "Ocorreu um erro";
        setError(message);
        if (options.toastOnError) toast.error(message);
        options.onError?.(e);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    // action/options are expected to be stable (defined in render); callers memoize when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action],
  );

  const reset = useCallback(() => setError(null), []);

  return { run, loading, error, reset };
}
