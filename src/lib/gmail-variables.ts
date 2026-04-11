export interface GmailVariable {
  key: string;       // o placeholder que vai no template, ex: "{{nome}}"
  label: string;     // nome amigável
  description: string;
}

export const GMAIL_VARIABLES: GmailVariable[] = [
  {
    key: "{{nome}}",
    label: "Nome do destinatário",
    description: "Nome do contato ou lead",
  },
  {
    key: "{{email}}",
    label: "E-mail do destinatário",
    description: "Endereço de e-mail do destinatário",
  },
  {
    key: "{{empresa}}",
    label: "Empresa",
    description: "Nome da empresa ou organização",
  },
  {
    key: "{{usuario}}",
    label: "Meu nome",
    description: "Seu nome (quem está enviando)",
  },
  {
    key: "{{data}}",
    label: "Data de hoje",
    description: "Data atual formatada (ex: 11/04/2026)",
  },
];

/** Substitui todas as variáveis conhecidas por seus valores reais */
export function applyVariables(
  text: string,
  values: {
    nome?: string;
    email?: string;
    empresa?: string;
    usuario?: string;
  }
): string {
  const today = new Date().toLocaleDateString("pt-BR");
  return text
    .replace(/\{\{nome\}\}/g, values.nome ?? "")
    .replace(/\{\{email\}\}/g, values.email ?? "")
    .replace(/\{\{empresa\}\}/g, values.empresa ?? "")
    .replace(/\{\{usuario\}\}/g, values.usuario ?? "")
    .replace(/\{\{data\}\}/g, today);
}
