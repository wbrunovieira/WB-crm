import Constants from "expo-constants";
import { BRANDS, type BrandColors } from "@/theme";

export type CompanyKey = "wb" | "rds";

export interface Company {
  key: CompanyKey;
  nome: string;
  curto: string;
  apiUrl: string;
  /** JWT embutido no build para esta empresa (ver mobile/.env). */
  token: string;
  cores: BrandColors;
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string; crmJwt?: string; apiUrlRds?: string; crmJwtRds?: string;
};

export const COMPANIES: Record<CompanyKey, Company> = {
  wb: {
    key: "wb",
    nome: "WB Digital Solutions",
    curto: "WB",
    apiUrl: extra.apiUrl || "https://crm-api.wbdigitalsolutions.com",
    token: extra.crmJwt || "",
    cores: BRANDS.wb,
  },
  rds: {
    key: "rds",
    nome: "RDS Transportes",
    curto: "RDS",
    apiUrl: extra.apiUrlRds || "https://crm-rds-api.wbdigitalsolutions.com",
    token: extra.crmJwtRds || "",
    cores: BRANDS.rds,
  },
};

/** Só as empresas com token embutido aparecem no seletor — sem token não há o que abrir. */
export function companiesDisponiveis(): Company[] {
  return Object.values(COMPANIES).filter((e) => e.token.length > 0);
}
