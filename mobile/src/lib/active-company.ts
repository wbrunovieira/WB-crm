import { COMPANIES, type Company, type CompanyKey } from "./companies";

/**
 * Empresa ativa para a camada de rede. `apiFetch` é chamado de funções comuns, fora de
 * componentes, então não pode usar hook — o CompanyProvider espelha a escolha aqui.
 */
let ativa: Company = COMPANIES.wb;

export function setEmpresaAtiva(k: CompanyKey): void {
  ativa = COMPANIES[k];
}

export function empresaAtiva(): Company {
  return ativa;
}
