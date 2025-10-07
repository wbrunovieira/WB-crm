import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number, currency: string = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
  }).format(value);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  // Use UTC to avoid timezone issues when displaying dates
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

// Exchange rates - BRL as base (1 BRL = X of target currency)
const EXCHANGE_RATES_TO_BRL: { [key: string]: number } = {
  BRL: 1,
  USD: 4.95,
  EUR: 5.35,
  GBP: 6.25,
};

// Available currencies for selection
export const AVAILABLE_CURRENCIES = [
  { code: "BRL", symbol: "R$", name: "Real" },
  { code: "USD", symbol: "$", name: "Dólar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "Libra" },
];

/**
 * Converts a value from one currency to another
 */
export function convertCurrency(value: number, fromCurrency: string, toCurrency: string): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return value;

  // Convert to BRL first (base currency)
  const rateFromToBRL = EXCHANGE_RATES_TO_BRL[from];
  if (!rateFromToBRL) {
    console.warn(`Exchange rate not found for currency: ${from}, defaulting to value`);
    return value;
  }
  const valueInBRL = value * rateFromToBRL;

  // Convert from BRL to target currency
  const rateBRLToTarget = EXCHANGE_RATES_TO_BRL[to];
  if (!rateBRLToTarget) {
    console.warn(`Exchange rate not found for currency: ${to}, returning BRL value`);
    return valueInBRL;
  }

  return valueInBRL / rateBRLToTarget;
}

/**
 * Converts a value from one currency to BRL
 */
export function convertToBRL(value: number, currency: string): number {
  return convertCurrency(value, currency, "BRL");
}

/**
 * Calculates the total value of deals in a target currency, converting from different currencies
 */
export function calculateTotalInCurrency(
  deals: Array<{ value: number; currency: string }>,
  targetCurrency: string = "BRL"
): number {
  return deals.reduce((total, deal) => {
    return total + convertCurrency(deal.value, deal.currency, targetCurrency);
  }, 0);
}

/**
 * Calculates the total value of deals in BRL, converting from different currencies
 */
export function calculateTotalInBRL(deals: Array<{ value: number; currency: string }>): number {
  return calculateTotalInCurrency(deals, "BRL");
}
