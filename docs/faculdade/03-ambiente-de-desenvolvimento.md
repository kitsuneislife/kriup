# 3. Ambiente de desenvolvimento

> **Summary.** As ferramentas e tecnologias usadas para construir, testar e rodar
> o Kriup, com a função de cada uma no projeto. Versões tiradas de
> `package.json`, `docker-compose.yml` e `.github/workflows/ci.yml` em 19/11/2026.

## 3.1 Ferramentas e tecnologias

### Linguagem e framework

| Tecnologia | Versão | Para que serve no projeto |
| --- | --- | --- |
| TypeScript | 6.0 | Linguagem de todo o código, em modo estrito. O compilador acusa erro de tipo antes de rodar, inclusive acesso a item de lista que pode não existir. |
| SvelteKit | 3.1 | Framework da aplicação. Junta no mesmo projeto as páginas, as ações de formulário e as rotas de API, renderizadas no servidor. |
| Svelte | 5.57 | Biblioteca de componentes da interface. Compila os componentes para JavaScript enxuto, o que ajuda a página pública a carregar rápido. |
| Vite | 8.3 | Servidor de desenvolvimento com recarga instantânea e empacotador do build de produção. |
| Node.js | 22 ou superior | Ambiente que executa o servidor, por meio do `@sveltejs/adapter-node`. |

### Dados e regras

| Tecnologia | Versão | Para que serve no projeto |
| --- | --- | --- |
| PostgreSQL | 17 | Banco relacional. Escolhido por transações e restrições fortes, que protegem o dinheiro (lançamento imutável, pedido pago uma vez só). |
| Drizzle ORM e drizzle-kit | 0.45 e 0.31 | Mapeia as tabelas para tipos TypeScript e gera as migrações versionadas em `drizzle/`. |
| Zod | 4.6 | Valida toda entrada externa: formulários, parâmetros de URL e webhooks do provedor de pagamento. |
| @node-rs/argon2 | 2.2 | Hash das senhas com argon2. |

### Serviços externos

Os dois ficam atrás de uma interface e só são usados se a chave estiver no `.env`. Sem chave, o sistema usa o simulador e o log, e funciona sem internet.

| Serviço | Para que serve | Alternativa local |
| --- | --- | --- |
| Asaas (sandbox) | Cobrança por Pix e cartão, webhook de pagamento e estorno | Simulador de pagamento com página própria |
| Resend | E-mails transacionais (acesso, reembolso, convite de coprodução) | E-mail impresso no console |
| Player externo (YouTube, Vimeo, Bunny) | Hospedar os vídeos das aulas | O produtor informa a URL |

### Qualidade e testes

| Ferramenta | Versão | Para que serve no projeto |
| --- | --- | --- |
| Vitest | 5.1 | Testes unitários das regras puras e testes de integração contra um PostgreSQL de teste. |
| fast-check | 4.10 | Testes de propriedade: gera milhares de valores e confere, por exemplo, que a soma das partes de uma venda é sempre igual ao líquido. |
| Playwright | 1.65 | Testes de ponta a ponta no navegador, em desktop e em 375 px, e as capturas de tela do Apêndice A. |
| @axe-core/playwright | 4.14 | Procura violações de acessibilidade em todas as rotas, nos temas claro e escuro. |
| svelte-check | 4.7 | Checagem de tipos dos componentes Svelte. |
| ESLint e Prettier | 10 e 3.9 | Padrão de código e formatação. O ESLint também barra importações que quebram a regra de camadas (seção 2.4.1). |

Números da última rodada completa [measured]: 276 testes unitários em 38 arquivos, 129 de integração em 12 arquivos e 289 de ponta a ponta. LCP das páginas públicas entre 376 e 440 ms no build de produção.

### Infraestrutura e apoio

| Ferramenta | Para que serve no projeto |
| --- | --- |
| Git e GitHub | Controle de versão, com mensagens no padrão Conventional Commits. Repositório público em https://github.com/kitsuneislife/kriup. |
| GitHub Actions | Integração contínua: a cada push e pull request roda lint, tipos, testes unitários, migrações, testes de integração, build e os testes de ponta a ponta. |
| Trello | Quadro do projeto com a documentação, os recursos e as tarefas em aberto: https://trello.com/b/eCZtlNHZ/kriup. |
| pnpm 11 | Gerenciador de pacotes, com versão fixada em `packageManager`. |
| Docker Compose (com colima no macOS) | Sobe o PostgreSQL local em um contêiner, na porta 5433. |
| Mermaid | Linguagem dos diagramas deste documento, escritos como texto no próprio repositório e renderizados com `@mermaid-js/mermaid-cli`. |
| Inter (fonte variável) | Tipografia da interface, servida pelo próprio sistema. |

### Como rodar

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Sobe o servidor de desenvolvimento em `http://localhost:5173` |
| `pnpm lint` e `pnpm check` | Formatação, lint e tipos |
| `pnpm test` | Testes unitários |
| `pnpm test:int` | Testes de integração (precisa do banco) |
| `pnpm test:e2e` | Testes de ponta a ponta |
| `pnpm test:review` | Build de produção, acessibilidade, LCP e capturas de tela |
| `pnpm build` | Build de produção |

### Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Endereço do PostgreSQL |
| `APP_URL` | Sim | Endereço público usado nos links dos e-mails |
| `PAYMENT_WEBHOOK_TOKEN` | Sim | Segredo que o provedor envia em todo webhook |
| `JOBS_TOKEN` | Sim | Token que autoriza o job diário |
| `ASAAS_API_KEY`, `ASAAS_BASE_URL` | Não | Liga o Asaas no lugar do simulador |
| `RESEND_API_KEY`, `EMAIL_FROM` | Não | Liga o Resend no lugar do log |
