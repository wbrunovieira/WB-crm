/**
 * Tema por negócio. Só a identidade muda entre WB (consultoria, roxo) e RDS
 * (frete, azul-marinho + laranja); cores de status (sucesso/erro/aviso) são
 * universais e continuam inline onde estão.
 *
 * Etapa 2: as telas importam `c` (cores do brand ativo) em vez de hex soltos.
 * O brand ativo é fixo aqui por ora — a TROCA em runtime (seletor + persistência
 * + reload) é a Etapa 5. Trocar BRAND abaixo já reveste o app inteiro.
 */
export type BrandColors = {
  bg: string;        // fundo da tela
  bgDeep: string;    // fundo mais profundo / institucional
  card: string;      // superfície de card
  border: string;    // bordas
  accent: string;    // ação: botões, destaques
  accentLight: string;
  text: string;      // texto principal
  textMuted: string;
  textFaint: string;
  textFaint2: string;
  textBright: string;
  textBright2: string;
};

export const BRANDS: Record<"wb" | "rds", BrandColors> = {
  wb: {
    bg: "#1a0022", bgDeep: "#350045", card: "#2a1533", border: "#4d2b5d",
    accent: "#762991", accentLight: "#c9a3e0",
    text: "#c9b3d6", textMuted: "#b79ec6", textFaint: "#8a6d9c", textFaint2: "#9b86a8",
    textBright: "#e9dcf0", textBright2: "#e7d9ee",
  },
  rds: {
    bg: "#06152e", bgDeep: "#002257", card: "#0a1f42", border: "#1f4a86",
    accent: "#e64d00", accentLight: "#ff8a4d",
    text: "#a9c2e0", textMuted: "#7fa3cc", textFaint: "#5a7ba6", textFaint2: "#6b8bb5",
    textBright: "#d6e6f7", textBright2: "#c4dbf0",
  },
};

/** Brand ativo. Etapa 5 troca isto em runtime via seletor + reload. */
export const BRAND: "wb" | "rds" = "wb";

export const c = BRANDS[BRAND];
