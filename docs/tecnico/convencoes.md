# Convenções de código

## 1. Idioma

- **Inglês:** código, nomes de pastas e arquivos, tabelas e colunas, valores de enum, rotas e URLs, campos de API, mensagens de commit, nomes de testes.
- **Português:** documentação em `docs/` e texto exibido ao usuário na interface.
- Texto da interface fica em um só lugar por tela (constantes ou arquivo de mensagens), nunca espalhado pela lógica.
- Um termo, um nome: o mesmo conceito tem o mesmo nome no banco, na API, no código e na interface. A tabela abaixo é a fonte.

## 2. Glossário português para inglês

| Português | Inglês (código) | Observação |
| --- | --- | --- |
| Usuário | `user` | |
| Produtor | `producer` | papel em um produto, não tipo de conta (RF-04) |
| Aluno | `student` | idem |
| Coprodutor | `coproducer` | idem |
| Suporte | `support` | `platform_role` do usuário |
| Produto | `product` | |
| Modelo | `template` | |
| Página | `page` | |
| Módulo | `module` | |
| Aula | `lesson` | |
| Oferta | `offer` | |
| Pedido | `order` | |
| Matrícula | `enrollment` | |
| Progresso da aula | `lesson_progress` | |
| Coprodução | `coproduction` | |
| Aceite | `acceptance` | |
| Lançamento | `ledger_entry` | |
| Retenção | `hold` | estado `held` |
| Saque | `payout` | |
| Reembolso | `refund` | |
| Mensagem | `message` | |
| Bloqueio | `block` | |
| Auditoria | `audit_log` | |
| Garantia | `guarantee` | |
| Sessão | `session` | |

Estados e enums também em inglês. As máquinas de estado vivem em `src/lib/domain/states.ts` e as migrações usam os mesmos valores:

| Máquina | Português | Inglês (código) |
| --- | --- | --- |
| `order.status` | aguardando, pago, expirado, recusado, reembolsado | `pending`, `paid`, `expired`, `declined`, `refunded` |
| `ledger_entry.state` | retido, liberado, sacado, estornado | `held`, `released`, `paid_out`, `reversed` |
| `refund.status` | com produtor, recusado, com plataforma, aprovado, recusado final, concluído | `with_producer`, `declined`, `with_platform`, `approved`, `final_declined`, `completed` |
| `refund.owner` | produtor, plataforma | `producer`, `platform` |

O pedido de reembolso nasce já decidido (`approved`, dentro da garantia) ou com o produtor (`with_producer`), então o estado "aberto" do diagrama não é gravado.

## 3. Nomenclatura

| Item | Estilo | Exemplo |
| --- | --- | --- |
| Pastas e arquivos | `kebab-case` | `split.ts`, `payment/` |
| Componentes Svelte | `PascalCase.svelte` | `BalanceCard.svelte` |
| Variáveis e funções | `camelCase` | `splitSale` |
| Tipos e interfaces | `PascalCase` | `PaymentGateway` |
| Tabelas | `snake_case`, singular | `ledger_entry` |
| Colunas | `snake_case` | `created_at`, `price_cents` |
| Valores em dinheiro | sufixo `_cents` | `gross_cents` |
| Datas | sufixo `_at`, `timestamptz` em UTC | `paid_at` |
| Percentuais | sufixo `_bp` (basis points) | `percent_bp` |

## 4. Regras de estrutura

- `src/lib/domain`: funções puras. Não importa banco, SvelteKit nem nada de `server`.
- `src/lib/server`: tudo que toca banco, segredo ou rede. Só importado por `routes` e por outros arquivos de `server`.
- `src/routes`: orquestra. Valida a entrada (Zod), checa papel e dono do recurso, chama `domain` e `server`.
- Testes ficam ao lado do código: `split.ts` e `split.test.ts`. Testes com banco usam o sufixo `.int.test.ts`.
- Dinheiro é inteiro em centavos. Nunca `number` com fração.

Versão do framework: SvelteKit 3. Importe de `src/lib` com `#lib/...` (o alias `$lib` foi removido) e leia variáveis de ambiente por `$app/env/private`, declaradas em `src/env.ts`. Em produção o adaptador Node assume HTTPS: defina a origem pública do site, senão formulários POST recebem 403 (proteção CSRF).

## 5. Qualidade

- TypeScript `strict`, mais `noUncheckedIndexedAccess`.
- ESLint e Prettier são o único formatador. O CI falha se `pnpm lint`, `pnpm check` ou `pnpm test` falharem.
- Commits no padrão Conventional Commits, em inglês.
