/**
 * Normalização de cidade para comparação robusta: ignora acento, caixa e
 * espaços extras. Assim "Petrópolis", "petropolis", "PETRÓPOLIS" e
 * "  petrópolis " são equivalentes.
 */
export function normalizeCity(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** A cidade do lead está entre as cidades atendidas presencialmente? */
export function cityIsServed(leadCity: string | null | undefined, cities: { city: string }[]): boolean {
  const n = normalizeCity(leadCity);
  if (!n) return false;
  return cities.some((c) => normalizeCity(c.city) === n);
}
