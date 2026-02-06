import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "WB-CRM API",
        version: "1.0.0",
        description: `
API REST do WB-CRM para integração com sistemas externos.

## Autenticação

A API usa autenticação via sessão NextAuth. Para usar a API de outro serviço no mesmo servidor:

1. Faça login via POST /api/auth/callback/credentials
2. Use os cookies de sessão nas requisições subsequentes

Ou use o header Authorization com Bearer token (se configurado).

## Rate Limits

- 100 requests por minuto por IP
- 1000 requests por hora por usuário

## Códigos de Status

- 200: Sucesso
- 201: Criado com sucesso
- 400: Dados inválidos
- 401: Não autorizado
- 404: Não encontrado
- 409: Conflito (ex: lead já convertido)
- 500: Erro interno
        `,
        contact: {
          name: "WB Digital Solutions",
          email: "bruno@wbdigitalsolutions.com",
        },
      },
      servers: [
        {
          url: "https://crm.wbdigitalsolutions.com",
          description: "Produção",
        },
        {
          url: "http://localhost:3000",
          description: "Desenvolvimento",
        },
      ],
      tags: [
        {
          name: "Leads",
          description: "Operações com leads (empresas prospectadas)",
        },
        {
          name: "Lead Contacts",
          description: "Contatos vinculados a leads",
        },
        {
          name: "Contacts",
          description: "Contatos de organizações",
        },
        {
          name: "Organizations",
          description: "Organizações (leads convertidos)",
        },
        {
          name: "Deals",
          description: "Negociações/oportunidades",
        },
        {
          name: "Activities",
          description: "Atividades (tarefas, ligações, reuniões)",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Token de autenticação NextAuth",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "next-auth.session-token",
            description: "Cookie de sessão NextAuth",
          },
        },
        schemas: {
          Lead: {
            type: "object",
            properties: {
              id: { type: "string", description: "ID único do lead" },
              businessName: { type: "string", description: "Nome comercial" },
              registeredName: { type: "string", description: "Razão social" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              whatsapp: { type: "string" },
              website: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              country: { type: "string" },
              status: {
                type: "string",
                enum: ["new", "contacted", "qualified", "disqualified"],
              },
              quality: {
                type: "string",
                enum: ["cold", "warm", "hot"],
              },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          LeadContact: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              role: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              whatsapp: { type: "string" },
              isPrimary: { type: "boolean" },
              leadId: { type: "string" },
            },
          },
          Contact: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              organizationId: { type: "string" },
              leadId: { type: "string" },
            },
          },
          Error: {
            type: "object",
            properties: {
              error: { type: "string", description: "Mensagem de erro" },
            },
          },
        },
      },
      security: [
        { bearerAuth: [] },
        { cookieAuth: [] },
      ],
    },
  });
  return spec;
};
