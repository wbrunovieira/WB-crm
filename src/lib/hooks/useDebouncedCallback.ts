import { useCallback, useRef } from "react";

type DebouncedFunction<Args extends unknown[]> = (...args: Args) => void;

export function useDebouncedCallback<Args extends unknown[]>(
  callback: DebouncedFunction<Args>,
  delay: number
): DebouncedFunction<Args> {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}
