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
| Chamado | `ticket` | contato de suporte ligado a um pedido |
| Token de senha | `password_token` | link para definir ou recuperar a senha |
| CPF/CNPJ | `tax_id` | pedido no checkout para o provedor; não é gravado |
| Cobrança | `charge` | cobrança no provedor de pagamento, ligada ao pedido por `external_id` |

Estados e enums também em inglês. As máquinas de estado vivem em `src/lib/domain/states.ts` e os enums do banco são gerados a partir delas (`statesOf`):

| Máquina | Português | Inglês (código) |
| --- | --- | --- |
| `order.status` | aguardando, pago, expirado, recusado, reembolsado | `pending`, `paid`, `expired`, `declined`, `refunded` |
| `ledger_entry.state` | retido, liberado, sacado, estornado | `held`, `released`, `paid_out`, `reversed` |
| `refund.status` | com produtor, recusado, com plataforma, aprovado, recusado final, concluído | `with_producer`, `declined`, `with_platform`, `approved`, `final_declined`, `completed` |
| `refund.owner` | produtor, plataforma | `producer`, `platform` |
| `product.status` | rascunho, publicado | `draft`, `published` |
| `enrollment.status` | ativa, revogada | `active`, `revoked` |
| `coproduction.status` | convidada, ativa, encerrada, cancelada | `invited`, `active`, `ended`, `canceled` |
| `payout.status` | solicitado, concluído, recusado | `requested`, `completed`, `declined` |
| `ticket.status` | aberto, fechado | `open`, `closed` |
| `ledger_entry.type` | venda, estorno, saque, taxa de saque, ajuste | `sale`, `reversal`, `payout`, `payout_fee`, `adjustment` |

Bloqueio não é estado do produto: fica em `block` (ver `modelo-de-dados.md`, seção 2).

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
- `src/lib/server/services`: casos de uso. Validam a entrada (Zod), checam papel e dono do recurso e gravam em transação.
- `src/routes`: fina. Lê a sessão (`requireUser`), chama um serviço dentro de `act()` e devolve o resultado.
- Testes ficam ao lado do código: `split.ts` e `split.test.ts`. Testes com banco usam o sufixo `.int.test.ts`, rodam em sequência e começam com `resetDb()` de `services/testing.ts`.
- Testes de ponta a ponta ficam em `e2e/` (`*.spec.ts`) e importam `test` e `expect` de `e2e/fixtures.ts`: `createUser` cria uma conta com e-mail único, `signIn` entra por cookie de sessão sem passar pela tela de login, `ctx` cria dados pelos serviços (`publishedProduct`, `buy`) e `expectAccessible` roda o axe nos temas claro e escuro. Como cada teste cria seus próprios dados, eles rodam em paralelo sem limpar o banco. Cada um roda em desktop e em 375 px.
- Dinheiro é inteiro em centavos. Nunca `number` com fração.

Versão do framework: SvelteKit 3. Importe de `src/lib` com `#lib/...` (o alias `$lib` foi removido) e leia variáveis de ambiente por `$app/env/private`, declaradas em `src/env.ts`. Em produção o adaptador Node assume HTTPS: defina a origem pública do site, senão formulários POST recebem 403 (proteção CSRF).

## 5. Qualidade

- TypeScript `strict`, mais `noUncheckedIndexedAccess`.
- ESLint e Prettier são o único formatador. O CI falha se `pnpm lint`, `pnpm check` ou `pnpm test` falharem.
- Commits no padrão Conventional Commits, em inglês.

## 6. Telas

- **Acesso.** As telas de quem entrou ficam no grupo `src/routes/(app)`, cujo layout exige sessão e monta o `Shell` com uma seção por perfil (`(app)/nav.ts`). `(app)/support` responde 404 a quem não é suporte. Ações de formulário não passam pelo `load` dos layouts, então toda ação chama `requireUser` ou `requireSupport` de novo, e o serviço confere papel e dono.
- **Erros.** O texto de todo erro sai de `src/lib/error-text.ts`: `errorText(code)` para o código do serviço e `issueText` para cada campo inválido, que o `act()` já aplica. Código novo em `DOMAIN_ERROR_CODES` sem texto quebra `pnpm check` e `pnpm test`. Recurso de outra pessoa e endereço inexistente caem na mesma página 404 (`src/routes/+error.svelte`).
- **Formulário.** Funciona sem JavaScript; com ele, `Submission` (`src/lib/forms.svelte.ts`) envia no lugar e põe o botão em carregamento. O erro geral vai num `Alert`, o de campo no `error` do próprio campo:

```svelte
<script lang="ts">
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { Alert, Button, TextField } from '#lib/ui';

	let { form } = $props();
	const save = new Submission();
</script>

<form method="post" use:save.enhance>
	<TextField name="name" label="Nome" error={form?.fields?.name} />
	{#if form?.code}<Alert tone="danger">{errorText(form.code)}</Alert>{/if}
	<Button type="submit" variant="primary" loading={save.loading('Salvando')}>Salvar</Button>
</form>
```
