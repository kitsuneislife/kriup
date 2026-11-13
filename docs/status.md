# Status

> **Summary.** Frontend do MVP em 88%: fases 0 a 7 concluídas (conta, criação do produto, venda, área do aluno, dinheiro, reembolso do produtor, coprodução). Próximo: fase 8, suporte. Backend completo; falta só ligar as telas.

Atualizado em 13/11/2026.

## Estado

- Fases 0 a 7 de `tecnico/frontend-plano.md` concluídas. Na fase 7, o produtor convida coprodutores e simula uma venda no editor (`…/coproduction`), e o coprodutor lê o contrato e aceita ou recusa (`/coproductions/[id]`). A parte dele aparece no extrato só a partir do aceite.
- Gates verdes [measured]: lint, check, 252 testes unitários, 98 de integração e 193 e2e (desktop e 375 px; 1 pulado de propósito no mobile).

## Próximo passo

Fase 8, suporte (UC-06): fila em `/support`, decisão de reembolso e chamado, bloqueios e auditoria, e `/support/payouts` (depende da decisão F2). Depois vem a fase 9 (fechamento).

## Riscos e pendências

- Decisões em aberto: F1 (logo e anexos só por URL ou com upload) e F2 (quem conclui o saque), em `tecnico/frontend-plano.md` seção 5; D3 a D6 em `tecnico/telas-testes-roadmap.md`.
- O pagamento ainda é simulado. A troca pelo Asaas está em `tecnico/pagamentos.md` seção 3.
- Ambiente local: o `pnpm` fixado em `packageManager` não tem binário darwin-x64. Rode com `pnpm_config_pm_on_fail=ignore` [measured].
- Saque pedido fica "Em análise" até existir `/support/payouts` (lote 8.4, decisão F2).
- Ambiente local: o banco sobe com `colima start` e `pnpm db:up`.
- Ambiente local: worktrees em paralelo precisam de banco próprio no `.env` (por exemplo `/app_m1`, que vira `app_m1_e2e`) e de `E2E_PORT` próprio [measured].
- Ambiente local: worktree com `node_modules` em symlink não roda `pnpm check` direito, porque o `$app/tsconfig` gerado aponta para o outro checkout. Rode o check no checkout que tem o `node_modules` real [measured].
- Ambiente local: com a máquina carregada, o e2e completo pode dar timeout. Use `--workers=4` [measured].
