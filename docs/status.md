# Status

> **Summary.** Frontend do MVP em 78%: fases 0 a 5 concluídas (conta, criação do produto, venda, área do aluno, dinheiro). Próximo: fase 6, reembolso do produtor. Backend completo; falta só ligar as telas.

Atualizado em 13/11/2026.

## Estado

- Fases 0 a 5 de `tecnico/frontend-plano.md` concluídas. Na fase 5, o produtor tem o painel do dinheiro (`/producer/money`), o extrato com filtros e regra por linha, que também serve ao coprodutor, e os saques com a taxa antes de confirmar.
- Gates verdes em `main` [measured]: lint, check, 226 testes unitários, 96 de integração e 155 e2e (desktop e 375 px; 1 pulado de propósito no mobile).

## Próximo passo

Fase 6, reembolso do lado do produtor (UC-05): `/producer/refunds` e `/producer/refunds/[id]`. Depois vêm as fases 7 (coprodução), 8 (suporte) e 9 (fechamento).

## Riscos e pendências

- Decisões em aberto: F1 (logo e anexos só por URL ou com upload) e F2 (quem conclui o saque), em `tecnico/frontend-plano.md` seção 5; D3 a D6 em `tecnico/telas-testes-roadmap.md`.
- O pagamento ainda é simulado. A troca pelo Asaas está em `tecnico/pagamentos.md` seção 3.
- Ambiente local: o `pnpm` fixado em `packageManager` não tem binário darwin-x64. Rode com `pnpm_config_pm_on_fail=ignore` [measured].
- Saque pedido fica "Em análise" até existir `/support/payouts` (lote 8.4, decisão F2).
- Ambiente local: o banco sobe com `colima start` e `pnpm db:up`.
- Ambiente local: worktrees em paralelo precisam de banco próprio no `.env` (por exemplo `/app_m1`, que vira `app_m1_e2e`) e de `E2E_PORT` próprio [measured].
- Ambiente local: com a máquina carregada, o e2e completo pode dar timeout. Use `--workers=4` [measured].
