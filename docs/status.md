# Status

> **Summary.** Frontend do MVP em 68%: fases 0 a 4 concluídas (conta, criação do produto, venda, área do aluno). Próximo: fase 5, Dinheiro. Backend completo; falta só ligar as telas.

Atualizado em 13/11/2026.

## Estado

- Fases 0 a 4 de `tecnico/frontend-plano.md` concluídas. Na fase 4, o aluno tem cursos com progresso, o player, os pedidos, o reembolso com conversa e contestação, e os chamados.
- Gates verdes em `main` [measured]: lint, check, 214 testes unitários, 96 de integração e 120 e2e (desktop e 375 px).

## Próximo passo

Fase 5, Dinheiro (UC-07): `/producer/money`, o extrato e os saques. Depois vêm as fases 6 (reembolso do produtor), 7 (coprodução), 8 (suporte) e 9 (fechamento).

## Riscos e pendências

- Decisões em aberto: F1 (logo e anexos só por URL ou com upload) e F2 (quem conclui o saque), em `tecnico/frontend-plano.md` seção 5; D3 a D6 em `tecnico/telas-testes-roadmap.md`.
- O pagamento ainda é simulado. A troca pelo Asaas está em `tecnico/pagamentos.md` seção 3.
- Ambiente local: o `pnpm` fixado em `packageManager` não tem binário darwin-x64. Rode com `pnpm_config_pm_on_fail=ignore` [measured].
- Ambiente local: o banco sobe com `colima start` e `pnpm db:up`.
- Ambiente local: com a máquina carregada, o e2e completo pode dar timeout. Use `--workers=4` [measured].
