export interface BrandConfig {
  companyName: string;
  primaryColor: string;
  headerBackground: string;
  bgColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  logoUrl: string | null;
  logoAlt: string;
  font: string;
  fallbackPurpose: string;
}

export const BRAND_CONFIGS: { domain: string; config: BrandConfig }[] = [
  {
    domain: "salto",
    config: {
      companyName: "Salto",
      primaryColor: "#ff5c00",
      headerBackground: "linear-gradient(to right, #0e0e0e 0%, #1a0800 40%, #ff5c00 100%)",
      bgColor: "#0e0e0e",
      surfaceColor: "#141414",
      borderColor: "#252525",
      textColor: "#f5f5f5",
      mutedColor: "#888888",
      logoUrl: "https://saltoup.com/logo.svg",
      logoAlt: "Salto",
      font: "Montserrat, Arial, sans-serif",
      fallbackPurpose: "Estamos animados para apresentar como a Salto pode ajudar a sua empresa a crescer com mais eficiência.",
    },
  },
  {
    domain: "wbdigitalsolutions",
    config: {
      companyName: "WB Digital Solutions",
      primaryColor: "#792990",
      headerBackground: "#792990",
      bgColor: "#350545",
      surfaceColor: "#4a1060",
      borderColor: "#5a2070",
      textColor: "#ffffff",
      mutedColor: "#aaa6c3",
      logoUrl: "https://www.wbdigitalsolutions.com/svg/logo-white.svg",
      logoAlt: "WB Digital Solutions",
      font: "'Plus Jakarta Sans', Arial, sans-serif",
      fallbackPurpose: "Estamos animados para entender os seus desafios tecnológicos e, a partir disso, apresentar como podemos ajudar — seja com desenvolvimento, automação, integrações ou IA.",
    },
  },
];

export const DEFAULT_BRAND: BrandConfig = {
  companyName: "",
  primaryColor: "#1a73e8",
  headerBackground: "#1a73e8",
  bgColor: "#ffffff",
  surfaceColor: "#f8f9fa",
  borderColor: "#e0e0e0",
  textColor: "#222222",
  mutedColor: "#666666",
  logoUrl: null,
  logoAlt: "",
  font: "Arial, sans-serif",
  fallbackPurpose: "Estamos animados para a nossa conversa!",
};

export function getBrandConfig(email: string): BrandConfig {
  const lower = email.toLowerCase();
  for (const { domain, config } of BRAND_CONFIGS) {
    if (lower.includes(domain)) return config;
  }
  return DEFAULT_BRAND;
}
