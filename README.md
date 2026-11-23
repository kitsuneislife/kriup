# Kriup

Plataforma de infoprodutos com criação guiada, venda única e assinatura mensal, área de membros, divisão de coprodução, reembolso com prazos, extrato auditável e operação de suporte (MVP acadêmico). Documentação completa em [`docs/`](docs/README.md) e estado atual em [`docs/status.md`](docs/status.md).

Repositório: <https://github.com/kitsuneislife/kriup>. Quadro do projeto no Trello: <https://trello.com/b/eCZtlNHZ/kriup>.

## Requisitos

Node 22 ou mais novo, pnpm 11 e Docker.

## Primeiros passos

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

O Postgres local usa a porta **5433** (a 5432 costuma estar ocupada por uma instalação nativa).

Por padrão, o `.env` roda com o meio de pagamento simulado (`/dev/payments/...`) e registra os e-mails no console. Para usar provedores reais, preencha opcionalmente `ASAAS_API_KEY` (e `ASAAS_BASE_URL`) e `RESEND_API_KEY` + `EMAIL_FROM` (ver [`docs/tecnico/pagamentos.md`](docs/tecnico/pagamentos.md)).

## Comandos

| Comando            | O que faz                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| `pnpm dev`         | Servidor de desenvolvimento                                                 |
| `pnpm lint`        | Prettier e ESLint                                                           |
| `pnpm format`      | Formata o repositório com Prettier                                          |
| `pnpm check`       | Tipos (`svelte-kit sync` + `svelte-check`, TypeScript `strict`)             |
| `pnpm test`        | Testes unitários e de propriedade (sem banco)                               |
| `pnpm test:int`    | Testes de integração com Postgres (exigem `pnpm db:up` e `pnpm db:migrate`) |
| `pnpm test:e2e`    | Testes de ponta a ponta com Playwright em desktop e 375 px                  |
| `pnpm test:review` | Build de produção + revisão de LCP e capturas finais com Playwright         |
| `pnpm db:generate` | Gera migração a partir de `src/lib/server/db/schema.ts`                     |
| `pnpm db:migrate`  | Aplica migrações (`0000` a `0005`, incluindo os 4 modelos de produto)       |
| `pnpm build`       | Build de produção                                                           |

O CI (`.github/workflows/ci.yml`) roda lint, check, testes unitários, migração, testes de integração e build, e em paralelo os testes de ponta a ponta.

Os testes de ponta a ponta usam um banco próprio ao lado do de desenvolvimento (`app_e2e`), criado, migrado e esvaziado a cada execução, e sobem o servidor na porta `E2E_PORT` (padrão 4173). Na primeira vez, instale o navegador com `pnpm exec playwright install chromium`.

## Estrutura

```
src/lib/domain/   regras de negócio puras e testadas (centavos, basis points, prazos)
src/lib/server/   banco (Drizzle), autenticação/LGPD, serviços, Asaas e Resend
src/lib/ui/       kit próprio de componentes acessíveis (temas claro e escuro)
src/routes/       páginas públicas, áreas autenticadas por perfil e rotas de API
e2e/              jornadas Playwright, acessibilidade (axe) e varredura de acesso
drizzle/          migrações SQL versionadas e semeadura de modelos
docs/             documentação de produto, engenharia e design em português
```

Código em inglês, documentação e interface em português: ver [`docs/tecnico/convencoes.md`](docs/tecnico/convencoes.md).
