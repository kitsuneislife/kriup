# Sistema Cakto

Plataforma de infoprodutos (MVP acadêmico). Documentação em [`docs/`](docs/README.md).

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

## Comandos

| Comando            | O que faz                                                      |
| ------------------ | -------------------------------------------------------------- |
| `pnpm dev`         | Servidor de desenvolvimento                                    |
| `pnpm lint`        | Prettier e ESLint                                              |
| `pnpm check`       | Tipos (svelte-check, TypeScript strict)                        |
| `pnpm test`        | Testes unitários (sem banco)                                   |
| `pnpm test:int`    | Testes de integração (exigem `pnpm db:up` e `pnpm db:migrate`) |
| `pnpm test:e2e`    | Testes de ponta a ponta com Playwright (exigem `pnpm db:up`)   |
| `pnpm db:generate` | Gera migração a partir de `src/lib/server/db/schema.ts`        |
| `pnpm db:migrate`  | Aplica migrações                                               |
| `pnpm build`       | Build de produção                                              |

O CI (`.github/workflows/ci.yml`) roda lint, check, testes, migração, testes de integração e build, e em paralelo os testes de ponta a ponta.

Os testes de ponta a ponta usam um banco próprio ao lado do de desenvolvimento (`app_e2e`), criado, migrado e esvaziado a cada execução, e sobem o servidor na porta 4173. Na primeira vez, instale o navegador com `pnpm exec playwright install chromium`.

## Estrutura

```
src/lib/domain/   regras de negócio puras e testadas
src/lib/server/   banco (Drizzle), autenticação, tudo que toca servidor
src/routes/       páginas e ações
drizzle/          migrações
docs/             documentação em português
```

Código em inglês, documentação em português: ver [`docs/tecnico/convencoes.md`](docs/tecnico/convencoes.md).
