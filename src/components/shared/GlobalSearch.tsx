"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, X, Loader2 } from "lucide-react";
import { buscarTudo, agruparPorTipo, ROTULO, type SearchHit, type SearchKind } from "@/lib/global-search";

const MINIMO_CARACTERES = 2;
const ESPERA_MS = 300;

/** Colour per kind, the same cue used elsewhere: green for a customer, purple for a
 *  prospect, blue for a person. Read before the label is. */
const COR: Record<SearchKind, { faixa: string; texto: string }> = {
  organization: { faixa: "#2f9e6e", texto: "#6fd8aa" },
  lead: { faixa: "#792990", texto: "#c9a2dd" },
  contact: { faixa: "#2f6f9e", texto: "#7ab8e8" },
};

export function GlobalSearch() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [termo, setTermo] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [parcial, setParcial] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [selecionado, setSelecionado] = useState(0);

  const caixaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against a slow earlier request landing after a newer one and overwriting it:
  // the user would see results for a query they already finished typing over.
  const sequenciaRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fechar = useCallback(() => {
    setAberto(false);
    setSelecionado(0);
  }, []);

  const limpar = useCallback(() => {
    setTermo("");
    setHits([]);
    setParcial(false);
    fechar();
  }, [fechar]);

  useEffect(() => {
    const q = termo.trim();
    if (q.length < MINIMO_CARACTERES || !token) {
      abortRef.current?.abort();
      setHits([]);
      setParcial(false);
      setCarregando(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const minha = ++sequenciaRef.current;

      setCarregando(true);
      try {
        const { hits: achados, parcial: incompleto } = await buscarTudo(token, q, controller.signal);
        if (minha !== sequenciaRef.current) return; // uma busca mais nova já respondeu
        setHits(achados);
        setParcial(incompleto);
        setSelecionado(0);
        setAberto(true);
      } catch {
        if (minha !== sequenciaRef.current) return;
        setHits([]);
        setParcial(true);
        setAberto(true);
      } finally {
        if (minha === sequenciaRef.current) setCarregando(false);
      }
    }, ESPERA_MS);

    return () => clearTimeout(timer);
  }, [termo, token]);

  // Fechar ao clicar fora
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) fechar();
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [fechar]);

  // Atalho de teclado: Ctrl/Cmd + K
  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", atalho);
    return () => document.removeEventListener("keydown", atalho);
  }, []);

  function abrir(hit: SearchHit) {
    limpar();
    router.push(hit.href);
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") return void limpar();
    if (!aberto || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelecionado((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelecionado((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[selecionado];
      if (hit) abrir(hit);
    }
  }

  const grupos = agruparPorTipo(hits);
  let indiceGlobal = -1;

  return (
    <div ref={caixaRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#8a6d9c" }} />
        <input
          ref={inputRef}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={teclado}
          onFocus={() => hits.length > 0 && setAberto(true)}
          placeholder="Buscar lead, cliente ou contato…"
          aria-label="Buscar lead, cliente ou contato"
          className="w-full rounded-lg border py-1.5 pl-8 pr-8 text-sm text-white placeholder:text-[#8a6d9c] focus:outline-none focus:ring-1"
          style={{ backgroundColor: "#2a1533", borderColor: "#4d2b5d" }}
        />
        {carregando ? (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" style={{ color: "#8a6d9c" }} />
        ) : termo ? (
          <button type="button" onClick={limpar} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5">
            <X className="h-4 w-4" style={{ color: "#8a6d9c" }} />
          </button>
        ) : null}
      </div>

      {aberto && termo.trim().length >= MINIMO_CARACTERES && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border shadow-xl"
          style={{ backgroundColor: "#1a0022", borderColor: "#4d2b5d" }}
        >
          {hits.length === 0 && !carregando && (
            <p className="px-3 py-3 text-sm" style={{ color: "#8a6d9c" }}>
              {parcial ? "Não foi possível buscar agora. Tente de novo." : "Nada encontrado."}
            </p>
          )}

          {parcial && hits.length > 0 && (
            <p className="border-b px-3 py-2 text-xs" style={{ color: "#e0b050", borderColor: "#4d2b5d" }}>
              Resultado parcial — uma das buscas falhou.
            </p>
          )}

          {grupos.map(([kind, lista]) => (
            <div key={kind}>
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: COR[kind].texto }}>
                {ROTULO[kind]}
              </p>
              {lista.map((hit) => {
                indiceGlobal += 1;
                const ativo = indiceGlobal === selecionado;
                return (
                  <button
                    key={`${hit.kind}:${hit.id}`}
                    type="button"
                    onClick={() => abrir(hit)}
                    onMouseEnter={() => setSelecionado(hits.indexOf(hit))}
                    className="flex w-full flex-col items-start border-l-4 px-3 py-2 text-left transition-colors"
                    style={{
                      borderLeftColor: COR[hit.kind].faixa,
                      backgroundColor: ativo ? "#2a1533" : "transparent",
                    }}
                  >
                    <span className="text-sm text-white">{hit.name}</span>
                    {hit.detail && (
                      <span className="text-xs" style={{ color: "#b79ec6" }}>
                        {hit.detail}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
