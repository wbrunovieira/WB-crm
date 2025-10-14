import { countries as countriesData } from "countries-list";

// Convert countries-list data to our select format
export const countries = Object.entries(countriesData)
  .map(([code, data]) => ({
    value: code,
    label: data.native || data.name, // Usa nome nativo quando disponível
  }))
  .sort((a, b) => {
    // Brasil sempre em primeiro
    if (a.value === "BR") return -1;
    if (b.value === "BR") return 1;
    // Ordenar o resto alfabeticamente
    return a.label.localeCompare(b.label);
  });
