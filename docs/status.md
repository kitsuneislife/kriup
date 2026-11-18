# Status

> **Summary.** Código do MVP de Ouro concluído: fases 0 a 8, lotes 9.1 a 9.3, assinaturas mensais (D5), adaptadores reais Asaas e Resend (D2), métricas Lean Canvas, encerramento LGPD (RNF-06) e exportação CSV. Falta o lote 9.4 (teste de uso com pessoas reais).

Atualizado em 18/11/2026.

## Estado

- Fases 0 a 8 e lotes 9.1 a 9.3 de `tecnico/frontend-plano.md` concluídos (jornadas entre perfis, prévia, axe em todas as rotas, varredura de acesso e LCP público entre 376 ms e 440 ms [measured]).
- Passe MVP de Ouro concluído [measured]: modelos extras (`subscription-club`, `workshop`, migração `0005`) e assinatura mensal ponta a ponta (D5); adaptadores `asaasGateway` e `resendMailer` ativados por variáveis opcionais (D2); `Shell` com marca, barra mobile compacta e contadores ao vivo (`listPendingCounts`); `/account` com edição de nome, tema (`cakto_theme`) e encerramento/anonimização LGPD (`closeAccount`, RNF-06) + `?next=` seguro no `/login`.
- Estúdio, dinheiro, aluno e suporte completos [measured]: editor das 3 páginas (`sales`, `checkout`, `access_email`), prévia em 4 visões, `CopyField` do link público, prévia ao vivo da marca, contagens de aulas/vendas e simulador ao vivo de coprodução; gráfico de 7 dias, total de páginas e CSV sanitizado (`GET /api/statement/export`); e-mail ao produtor em reembolso fora da garantia, máscara CPF/CNPJ, política no checkout, navegação completa no player e painel `/support/metrics` (`getPlatformMetrics`).
- Gates verdes [measured]: `pnpm lint` e `pnpm check` sem erros ou avisos; 276 testes unitários (38 arquivos), 129 de integração (12 arquivos) e 289 e2e aprovados + 1 ignorado (desktop e mobile 375 px); `pnpm test:review` com build de produção, LCP mediano de 376–440 ms (orçamento ≤ 2500 ms) e 70 capturas (35 desktop + 35 mobile) em `test-results/captures/`.

## Próximo passo

Rodar o lote 9.4: teste de uso com 3 a 5 pessoas não técnicas seguindo `produto/teste-de-uso.md`. LCP e capturas finais: `pnpm test:review`.

## Riscos e pendências

- Decisões em aberto: F1 (logo e anexos só por URL ou com upload) em `tecnico/frontend-plano.md`; D1, D3, D4 e D6 em `tecnico/telas-testes-roadmap.md` (D2, D5 e F2 decididas).
- Provedores externos: sem `ASAAS_API_KEY` ou `RESEND_API_KEY`/`EMAIL_FROM`, o app usa o simulador de pagamentos e o log no console (`tecnico/pagamentos.md`).
- Ambiente local: rode `pnpm` com `pnpm_config_pm_on_fail=ignore` e o Docker/Colima com `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` [measured].
- Banco local: suba com `colima start` e `pnpm db:up` e aplique `pnpm db:migrate` (até a migração `0005`) [measured].
- Execução paralela: worktrees precisam de banco e `E2E_PORT` próprios, `node_modules` real para `pnpm check` e `--workers=4` sob carga alta [measured].
