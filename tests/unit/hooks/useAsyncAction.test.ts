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

  it("loading fica true durante a ação pendente e volta a false", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { result } = renderHook(() => useAsyncAction(async () => { await gate; return 1; }));

    let p!: Promise<number | undefined>;
    act(() => { p = result.current.run(); });
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => { release(); await p; });
    expect(result.current.loading).toBe(false);
  });

  it("run é estável e usa options frescas (sem stale closure)", async () => {
    const onSuccess = vi.fn();
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useAsyncAction(async () => "x", { successMessage: msg, onSuccess }),
      { initialProps: { msg: "first" } },
    );
    const firstRun = result.current.run;
    rerender({ msg: "second" }); // options inline mudam a cada render
    expect(result.current.run).toBe(firstRun); // run permanece estável

    await act(async () => { await result.current.run(); });
    expect(toast.success).toHaveBeenCalledWith("second"); // usa a option mais nova
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
