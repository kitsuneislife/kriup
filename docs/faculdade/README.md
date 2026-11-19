# Documentação acadêmica (Startup)

> **Summary.** Documento de entrega da disciplina de Startup (ADS, Senac), em
> Markdown, um arquivo por capítulo, na ordem do roteiro pedido pelo professor.
> Serve de fonte para gerar o .docx no modelo da faculdade. Os docs de
> `produto/`, `tecnico/` e `design/` continuam sendo a fonte de verdade do sistema.

## Marcadores a trocar antes de gerar o .docx

| Marcador | O que é |
| --- | --- |
| `{{PRODUTO}}` | Nome do produto, ainda em definição. "Sistema Cakto" é só o nome provisório do repositório; Cakto é uma empresa real e concorrente, então o nome não pode ficar. |
| `{{GRUPO}}` | Nomes dos integrantes do grupo. |
| `{{ORGANIZACAO_DO_GRUPO}}` | Como o grupo dividiu tarefas e se reuniu (seção 2.1). |
| `{{DATA_ENTREGA}}` | Data da apresentação, para a capa do .docx. |
| `{{EDITOR}}` | Editor de código usado pelo grupo (seção 3.1). |
| `{{RESULTADOS_TESTE_DE_USO}}` | Resumo do teste de uso do lote 9.4, quando rodar (Apêndice C.3). |

Para listar o que falta: `grep -rn "{{" docs/faculdade`.

## Capítulos

| Arquivo | Roteiro do professor |
| --- | --- |
| [01-introducao.md](01-introducao.md) | 1. Introdução e contextualização (1.1 a 1.5) |
| [02-engenharia-e-modelagem.md](02-engenharia-e-modelagem.md) | 2. Engenharia e modelagem (2.1 a 2.5, com os diagramas) |
| [03-ambiente-de-desenvolvimento.md](03-ambiente-de-desenvolvimento.md) | 3. Ambiente de desenvolvimento (3.1) |
| [04-apendices.md](04-apendices.md) | Apêndices (telas, regras de negócio, testes, pesquisa) |

As telas do Apêndice A estão em `img/telas/`. Elas vêm de `pnpm test:review` (pasta `test-results/captures/`, ignorada pelo git) e foram copiadas para cá em 19/11/2026.

## Diagramas

Todos os diagramas são Mermaid, escritos dentro dos próprios capítulos: 18, todos no capítulo 2. Cada um foi renderizado com `@mermaid-js/mermaid-cli` em 19/11/2026 sem erro [measured]. O Mermaid não tem diagrama de casos de uso da UML, então os casos de uso usam fluxograma: atores em retângulo, casos de uso em elipse e «include»/«extend» nas setas pontilhadas. Para gerar as imagens do .docx:

```bash
pnpm dlx @mermaid-js/mermaid-cli -i docs/faculdade/02-engenharia-e-modelagem.md -o build/diagramas/cap2.md
```

O comando escreve um `.svg` por diagrama e uma cópia do Markdown apontando para as imagens.
