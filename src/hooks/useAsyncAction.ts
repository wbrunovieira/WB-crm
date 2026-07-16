"use client";

import { useCallback, useRef, useState } from "react";
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
 *
 * Note: since `run` resolves `undefined` both on failure and on a legitimate
 * `undefined` success, branch on `error` (or use `onSuccess`), not the return.
 * `run` is referentially stable; `action`/`options` are read fresh via refs.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {},
): UseAsyncActionReturn<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest action/options in refs so `run` stays stable (deps []) while
  // always calling the current callbacks — no stale closures with inline options.
  const actionRef = useRef(action);
  actionRef.current = action;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    const opts = optionsRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await actionRef.current(...args);
      if (opts.successMessage) toast.success(opts.successMessage);
      opts.onSuccess?.(result);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : opts.errorMessage ?? "Ocorreu um erro";
      setError(message);
      if (opts.toastOnError) toast.error(message);
      opts.onError?.(e);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { run, loading, error, reset };
}
