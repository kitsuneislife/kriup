# Status

> **Summary.** Frontend do MVP em 95%: fases 0 a 8 concluídas (conta, criação do produto, venda, área do aluno, dinheiro, reembolso do produtor, coprodução, suporte). Próximo: fase 9, integração e fechamento.

Atualizado em 13/11/2026.

## Estado

- Fases 0 a 7 de `tecnico/frontend-plano.md` concluídas. Na fase 7, o produtor convida coprodutores e simula uma venda no editor (`…/coproduction`), e o coprodutor lê o contrato e aceita ou recusa (`/coproductions/[id]`). A parte dele aparece no extrato só a partir do aceite.
- Fase 8 concluída: o suporte tem fila, decisão de reembolso, chamados, bloqueios, auditoria e saques (`/support/**`). F2 decidida: quem conclui o saque é o suporte.
- Gates verdes [measured]: lint, check, 262 testes unitários, 109 de integração e 219 e2e (desktop e 375 px; 1 pulado de propósito no mobile).

## Próximo passo

Fase 9, fechamento: lote 9.1, jornada completa entre perfis num só e2e; depois 9.2 a 9.4 (`tecnico/frontend-plano.md`).

## Riscos e pendências

- Decisões em aberto: F1 (logo e anexos só por URL ou com upload), em `tecnico/frontend-plano.md` seção 5; D3 a D6 em `tecnico/telas-testes-roadmap.md`.
- O pagamento ainda é simulado. A troca pelo Asaas está em `tecnico/pagamentos.md` seção 3.
- Ambiente local: o `pnpm` fixado em `packageManager` não tem binário darwin-x64. Rode com `pnpm_config_pm_on_fail=ignore` [measured].
- Banco local: depois de puxar a fase 8, rode `pnpm db:migrate` (migração 0004) [measured].
- Ambiente local: neste perfil, o docker só acha o colima com `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` [measured].
- Ambiente local: o banco sobe com `colima start` e `pnpm db:up`.
- Ambiente local: worktrees em paralelo precisam de banco próprio no `.env` (por exemplo `/app_m1`, que vira `app_m1_e2e`) e de `E2E_PORT` próprio [measured].
- Ambiente local: worktree com `node_modules` em symlink não roda `pnpm check` direito, porque o `$app/tsconfig` gerado aponta para o outro checkout. Rode o check no checkout que tem o `node_modules` real [measured].
- Ambiente local: com a máquina carregada, o e2e completo pode dar timeout. Use `--workers=4` [measured].
