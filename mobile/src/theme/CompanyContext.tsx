import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COMPANIES, companiesDisponiveis, type Company, type CompanyKey } from "@/lib/companies";
import { setEmpresaAtiva } from "@/lib/active-company";
import type { BrandColors } from "@/theme";

const CHAVE = "empresa_ativa";

interface Ctx {
  empresa: Company;
  trocar: (k: CompanyKey) => Promise<void>;
  disponiveis: Company[];
}

const CompanyCtx = createContext<Ctx | null>(null);

/**
 * Empresa ativa do app (WB consultoria / RDS frete). Cada uma tem suas cores, sua API e
 * seu token — trocar troca as três de uma vez.
 *
 * Reativo de propósito: as telas montam seus estilos a partir das cores daqui, então a
 * troca repinta o app na hora. Essa é a razão de os estilos viverem dentro dos componentes
 * (makeStyles) e não em StyleSheet de módulo: um StyleSheet de módulo é criado no import,
 * antes de sabermos qual empresa está ativa — e a escolha só pode ser lida de forma
 * assíncrona, porque o app não tem storage síncrono.
 */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<CompanyKey>("wb");

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if ((v === "wb" || v === "rds") && COMPANIES[v].token) {
          setKey(v);
          setEmpresaAtiva(v);
        }
      })
      .catch(() => {
        // Preferência não lida: segue na WB. Não vale travar o app por isso.
      });
  }, []);

  const valor = useMemo<Ctx>(
    () => ({
      empresa: COMPANIES[key],
      disponiveis: companiesDisponiveis(),
      trocar: async (k) => {
        setKey(k);
        setEmpresaAtiva(k); // a camada de rede lê daqui
        try {
          await AsyncStorage.setItem(CHAVE, k);
        } catch {
          // A troca vale para esta sessão mesmo se não persistir.
        }
      },
    }),
    [key],
  );

  return <CompanyCtx.Provider value={valor}>{children}</CompanyCtx.Provider>;
}

function ctx(): Ctx {
  const v = useContext(CompanyCtx);
  if (!v) throw new Error("useEmpresa/useBrand fora do CompanyProvider");
  return v;
}

/** Empresa ativa + troca + lista para o seletor. */
export function useEmpresa(): Ctx {
  return ctx();
}

/** Só as cores — o que a maioria das telas precisa. */
export function useBrand(): BrandColors {
  return ctx().empresa.cores;
}
