/**
 * Taxonomia canônica de segmentos comerciais.
 * Sempre em português. Um nome por conceito.
 * Normalização acontece no import — o banco nunca recebe variantes.
 */

export const CANONICAL_SEGMENTS = [
  "Alimentação e Gastronomia",
  "Confeitaria e Doçaria",
  "Beleza e Estética",
  "Barbearia",
  "Saúde e Clínicas",
  "Academia e Fitness",
  "Vestuário e Moda",
  "Moda Nupcial",
  "Pet Shop e Serviços",
  "Hotel para Pets",
  "Móveis e Decoração",
  "Gráfica e Comunicação Visual",
  "Automotivo e Peças",
  "Lava a Jato e Detalhamento",
  "Mecânica",
  "Celulares e Tecnologia",
  "Imobiliária",
  "Esportes e Surf",
  "Tatuagem e Arte Corporal",
  "Turismo e Viagens",
  "Vinhos e Bebidas",
  "Empresa de Limpeza",
  "Arte e Criação",
  "Materiais de Construção",
  "Materiais Elétricos",
  "Construção e Reformas",
  "Ferramentas e Equipamentos",
  "Utilidades Domésticas",
  "Agricultura",
  "Tintas e Revestimentos",
] as const;

export type CanonicalSegment = (typeof CANONICAL_SEGMENTS)[number];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Aliases: qualquer variante (qualquer idioma) → canônico português
const ALIASES: Record<string, CanonicalSegment> = {
  // ── Inglês — planilha Portugal ───────────────────────────────────────────────
  "food":                        "Alimentação e Gastronomia",
  "food store":                  "Alimentação e Gastronomia",
  "cake store":                  "Confeitaria e Doçaria",
  "candy store":                 "Confeitaria e Doçaria",
  "beauty services":             "Beleza e Estética",
  "beauty studio":               "Beleza e Estética",
  "bauty studio":                "Beleza e Estética",
  "beauty clinic":               "Beleza e Estética",
  "barber shop":                 "Barbearia",
  "barbershop":                  "Barbearia",
  "health company":              "Saúde e Clínicas",
  "health industry":             "Saúde e Clínicas",
  "optic for kids":              "Saúde e Clínicas",
  "gym":                         "Academia e Fitness",
  "clothes":                     "Vestuário e Moda",
  "clothes store":               "Vestuário e Moda",
  "dress weeding":               "Moda Nupcial",
  "dress wedding":               "Moda Nupcial",
  "petshop":                     "Pet Shop e Serviços",
  "pet shop":                    "Pet Shop e Serviços",
  "pet services":                "Pet Shop e Serviços",
  "pet hotel":                   "Hotel para Pets",
  "furniture":                   "Móveis e Decoração",
  "graphic industry":            "Gráfica e Comunicação Visual",
  "automotive store":            "Automotivo e Peças",
  "car wash and detail":         "Lava a Jato e Detalhamento",
  "car wash and products":       "Lava a Jato e Detalhamento",
  "car wash":                    "Lava a Jato e Detalhamento",
  "mechanic":                    "Mecânica",
  "phone store":                 "Celulares e Tecnologia",
  "real estate":                 "Imobiliária",
  "surf store":                  "Esportes e Surf",
  "surf shop":                   "Esportes e Surf",
  "tattoo shop":                 "Tatuagem e Arte Corporal",
  "tattoo studio":               "Tatuagem e Arte Corporal",
  "tours":                       "Turismo e Viagens",
  "travel agency":               "Turismo e Viagens",
  "wine store":                  "Vinhos e Bebidas",
  "wine shop":                   "Vinhos e Bebidas",
  "cleaning company":            "Empresa de Limpeza",
  "cleaning service":            "Empresa de Limpeza",
  "artist":                      "Arte e Criação",
  // ── Português fragmentado — CRM atual ────────────────────────────────────────
  "loja de materiais de construcao":                                          "Materiais de Construção",
  "loja  de materiais de construcao":                                         "Materiais de Construção",
  "material de construcao":                                                   "Materiais de Construção",
  "materiais para construcao":                                                "Materiais de Construção",
  "varejo de materiais de construcao":                                        "Materiais de Construção",
  "comercio varejista de materiais de construcao":                            "Materiais de Construção",
  "comercio atacadista de materiais de construcao":                           "Materiais de Construção",
  "comercio de ferragens e materiais de construcao":                          "Materiais de Construção",
  "comercio de materiais tecnicos para construcao":                           "Materiais de Construção",
  "comercio de revestimentos ceramicos e porcelanatos":                       "Materiais de Construção",
  "comercio de tintas e materiais de construcao":                             "Materiais de Construção",
  "comercio varejista de materiais eletricos":                                "Materiais Elétricos",
  "comercio varejista de material eletrico":                                  "Materiais Elétricos",
  "obras de acabamento em gesso":                                             "Construção e Reformas",
  "obras de terraplenagem":                                                   "Construção e Reformas",
  "esquadrias de aluminio e vidros":                                          "Construção e Reformas",
  "fabricacao de esquadrias de metal e artigos de carpintaria para construcao": "Construção e Reformas",
  "comercio varejista de ferramentas e equipamentos agricolas":               "Ferramentas e Equipamentos",
  "comercio varejista de artigos de bazar e utilidades domesticas":           "Utilidades Domésticas",
  "varejo de utilidades domesticas":                                          "Utilidades Domésticas",
  "comercio varejista":                                                       "Utilidades Domésticas",
  "comunicacao visual design grafico letreiros e placas":                     "Gráfica e Comunicação Visual",
  "comunicacao visual, design grafico, letreiros e placas":                   "Gráfica e Comunicação Visual",
  "agricultura e desenvolvimento rural":                                      "Agricultura",
  "comercio varejista de artigos de decoracao":                               "Móveis e Decoração",
  "comercio a varejo de pecas e acessorios novos para veiculos":              "Automotivo e Peças",
  "comercio varejista de tintas e produtos de pintura":                       "Tintas e Revestimentos",
};

// Lookup reverso: canônicos normalizados → canônico original (evita re-normalizar algo já certo)
const CANONICAL_NORM = new Map<string, CanonicalSegment>(
  CANONICAL_SEGMENTS.map((s) => [norm(s), s])
);

/**
 * Recebe qualquer valor de segmento (qualquer idioma, qualquer variante)
 * e retorna o nome canônico em português.
 * Se não encontrar correspondência, devolve o valor original.
 */
export function normalizeSegment(raw: string): string {
  if (!raw?.trim()) return raw;
  const n = norm(raw);
  return CANONICAL_NORM.get(n) ?? ALIASES[n] ?? raw;
}
