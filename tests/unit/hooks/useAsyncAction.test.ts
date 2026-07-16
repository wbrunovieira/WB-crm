import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAsyncAction } from "@/hooks/useAsyncAction";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

describe("useAsyncAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolve com o resultado e chama onSuccess + toast de sucesso", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useAsyncAction(async (n: number) => n * 2, { successMessage: "ok", onSuccess }),
    );

    let out: number | undefined;
    await act(async () => { out = await result.current.run(21); });

    expect(out).toBe(42);
    expect(onSuccess).toHaveBeenCalledWith(42);
    expect(toast.success).toHaveBeenCalledWith("ok");
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("captura o erro, expõe a mensagem e NÃO lança (run resolve undefined)", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useAsyncAction(async () => { throw new Error("falhou"); }, { onError }),
    );

    let out: unknown = "sentinel";
    await act(async () => { out = await result.current.run(); });

    expect(out).toBeUndefined();
    expect(result.current.error).toBe("falhou");
    expect(onError).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled(); // toastOnError default false
  });

  it("toastOnError=true dispara toast de erro", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => { throw new Error("boom"); }, { toastOnError: true }),
    );
    await act(async () => { await result.current.run(); });
    expect(toast.error).toHaveBeenCalledWith("boom");
  });

  it("reset limpa o erro", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => { throw new Error("x"); }),
    );
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBe("x");
    act(() => result.current.reset());
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
