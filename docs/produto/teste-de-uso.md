# Teste de uso (lote 9.4)

> **Summary.** Roteiro para o teste com 3 a 5 pessoas não técnicas criando o primeiro produto (UC-01, US-01). Diz quem recrutar, como preparar o ambiente, o que pedir, o que medir e onde registrar. Os resultados entram na tabela da seção 6, e cada trava vira um ajuste com teste.

## 1. Quem

3 a 5 pessoas que nunca venderam produto digital e não trabalham com tecnologia: por exemplo, quem dá aula particular, faz artesanato ou tem uma receita a ensinar. Ninguém da equipe e ninguém que já viu o sistema.

## 2. Preparo

- Ambiente local limpo: `colima start`, `pnpm db:up`, `pnpm db:migrate`, `pnpm build && pnpm preview` (o build de produção, não o `dev`).
- Uma conta nova por pessoa, criada por ela mesma em `/register`.
- Tela gravada (com consentimento) e uma pessoa da equipe anotando. Quem conduz não ajuda: se perguntarem, devolve "o que você faria?".
- Metade das sessões no celular (375 px), metade no computador.

## 3. Tarefa

Ler em voz alta para a pessoa:

> "Você vai vender um curso curto sobre algo que sabe fazer. Crie a sua conta, monte o produto com o nome, o preço e a cor que quiser, coloque pelo menos uma aula e deixe o produto publicado, pronto para vender. Pense em voz alta enquanto faz."

Ao terminar, pedir: "Agora me mostre como o aluno vai ver o seu produto" (prévia, RF-16).

## 4. O que medir

| Medida | Como | Meta |
| --- | --- | --- |
| Concluiu sem ajuda | Produto publicado sem intervenção | 4 de 5 |
| Tempo até publicar | Do `/register` ao produto publicado | menos de 15 min |
| Travas | Momentos parados por mais de 30 s ou com pergunta ao condutor | anotar cada uma, com a tela |
| Erros | Mensagem de erro vista e se a pessoa entendeu o que fazer | anotar o texto |
| Nota | "De 0 a 10, quão fácil foi?" | média 8 ou mais |

## 5. Depois de cada sessão

Uma linha por trava na tabela abaixo, com a tela (`/rota`), o que aconteceu e a gravidade: alta (não publicou), média (publicou com esforço), baixa (incômodo). As travas altas e médias viram ajuste no código com teste e2e antes de fechar o lote.

## 6. Resultados

| Data | Pessoa (perfil) | Aparelho | Publicou? | Tempo | Nota | Travas |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

| Trava | Tela | Gravidade | Ajuste (commit) |
| --- | --- | --- | --- |
| | | | |
