# Tests — WB-CRM (frontend)

Testes unitários do **frontend Next.js**. O acesso a dados migrou para o backend
NestJS (Strangler Fig) — o `src/` não usa mais Prisma, então estes testes cobrem
apenas **lógica pura do frontend**: validações Zod, utilitários, cálculos e
componentes. Os testes de domínio/dados (use cases, repositórios, e2e de API)
ficam em `backend/test/` e rodam com `npm --prefix backend test`.

> `npm test` (raiz) roda os dois: `vitest run` (este diretório) **e** a suíte do backend.

## Estrutura

```
tests/
├── setup.ts                 # mocks globais de next-auth / next-cache / next-navigation
├── lib/                     # errors, logger
├── logging/                 # action-logs, request-logs
└── unit/
    ├── validations/         # schemas Zod (icp, manager, organization-hosting, …)
    ├── funnel/              # cálculos de funil (computeFunnelStats, computeGoalBreakdown)
    ├── lib/                 # api-client, email-campaigns/progress-stats, import/parse-file
    └── components/          # phone-link, hosting-renewals-widget (happy-dom)
```

## Executando

```bash
npm test            # frontend + backend
npx vitest run      # só o frontend (este diretório)
npm run test:watch  # watch
npm run test:ui     # UI do Vitest
npm run test:coverage
```

## Convenções

- Arquivos: `*.test.ts` / `*.test.tsx`. Padrão AAA (Arrange, Act, Assert).
- Não há mock de banco aqui — o frontend fala com o backend via `apiFetch`; em
  testes de componente, mocke `apiFetch`/`fetch` quando necessário.
- Mocks globais de `next-auth`, `next/cache` e `next/navigation` vivem em `setup.ts`.

## Recursos

- [Vitest](https://vitest.dev/) · [Testing Library](https://testing-library.com/)
