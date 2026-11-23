# Documentação acadêmica (Startup)

> **Summary.** Documento de entrega da disciplina de Startup (ADS, Senac), em
> Markdown, um arquivo por capítulo, na ordem do roteiro pedido pelo professor.
> Serve de fonte para gerar o .docx no modelo da faculdade. Os docs de
> `produto/`, `tecnico/` e `design/` continuam sendo a fonte de verdade do sistema.

## Nome e marcadores

O produto se chama Kriup (nome e logo propostos por Camilo; a marca usa preto #000 no lugar do azul-marinho por decisão de Joaquim, ver `../design/marca.md`). O documento não tem mais marcadores `{{...}}`. Se algum voltar, o gerador o destaca em amarelo; para listar: `grep -rn "{{" docs/faculdade`.

A data da capa (23 de novembro de 2026, dia da entrega) fica em `gerar-docx.py`, na função `capa`.

O Apêndice C.3 diz que o teste de uso ainda não foi feito. Quando o lote 9.4 rodar, troque essa frase pelo resumo e preencha a tabela.

## Capítulos

| Arquivo | Roteiro do professor |
| --- | --- |
| [01-introducao.md](01-introducao.md) | 1. Introdução e contextualização (1.1 a 1.5) |
| [02-engenharia-e-modelagem.md](02-engenharia-e-modelagem.md) | 2. Engenharia e modelagem (2.1 a 2.5, com os diagramas) |
| [03-ambiente-de-desenvolvimento.md](03-ambiente-de-desenvolvimento.md) | 3. Ambiente de desenvolvimento (3.1) |
| [04-apendices.md](04-apendices.md) | Apêndices (telas, regras de negócio, testes, pesquisa) |

As telas do Apêndice A estão em `img/telas/`. Elas vêm de `pnpm test:review` (pasta `test-results/captures/`, ignorada pelo git) e foram copiadas para cá em 19/11/2026.

## Diagramas

Todos os diagramas são Mermaid, escritos dentro dos próprios capítulos: 18, todos no capítulo 2. Cada um foi renderizado com `@mermaid-js/mermaid-cli` em 19/11/2026 sem erro [measured]. O Mermaid não tem diagrama de casos de uso da UML, então os casos de uso usam fluxograma: atores em retângulo, casos de uso em elipse e «include»/«extend» nas setas pontilhadas. As imagens usadas no .docx ficam em `img/diagramas/cap2-01.png` a `cap2-18.png`, na ordem em que os blocos aparecem no capítulo. Quem mudar um diagrama precisa renderizar o PNG de novo (fundo branco, escala 3):

```bash
pnpm dlx @mermaid-js/mermaid-cli -i diagrama.mmd -o docs/faculdade/img/diagramas/cap2-NN.png -b white -s 3
```

## Gerar o .docx

```bash
python3 docs/faculdade/gerar-docx.py
```

O script usa só a biblioteca padrão do Python. Ele lê os quatro capítulos e escreve `saida/documentacao.docx` sobre o modelo da faculdade (`modelo/template-docs-startup.docx`), mantendo o cabeçalho dele. O formato segue o pedido: corpo em Arial 11, justificado, espaçamento 1,5; títulos em negrito; itálico só nos destaques.

- Capa e sumário são montados pelo script. No Word, clique com o botão direito no sumário e escolha "Atualizar campo" para aparecerem os números de página.
- Se um marcador `{{...}}` voltar ao texto, ele sai realçado em amarelo.
- Tabelas ficam alinhadas à esquerda e com espaço simples, e itens com endereço da web ficam à esquerda, para não abrir buracos entre as palavras.
- Os diagramas largos (2.7, 2.9, 2.11 e 2.18) ficam numa página deitada. A lista fica em `DIAGRAMAS_DEITADOS`, e as legendas das figuras do capítulo 2 em `LEGENDAS_DIAGRAMAS`; se um diagrama entrar ou sair, atualize as duas.

Para conferir o resultado sem o Word: `soffice --headless --convert-to pdf docs/faculdade/saida/documentacao.docx`.
