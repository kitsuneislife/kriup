# Tipografia

Referência: _Typography_ da Apple (San Francisco). Tokens em `src/lib/ui/tokens.css`; o componente é `Text`; `/design`, seção "Tipografia", mostra todos os estilos.

## 1. Fonte

`-apple-system, BlinkMacSystemFont, 'SF Pro', 'Inter Variable', system-ui, ...`

- Em dispositivos Apple a pilha usa a **San Francisco** de verdade, com tamanho óptico automático.
- Nos demais, entra a **Inter Variable** (pacote `@fontsource-variable/inter`, licença OFL, com eixo óptico). É a fonte aberta mais próxima da SF: mesma proporção, mesma limpeza, mesma altura de x.
- Por que não embutir a SF: a licença da Apple permite usá-la para desenhar interfaces, mas não distribuí-la com o site.
- Números de dinheiro, datas e colunas usam `numeric` (algarismos tabulares), para os valores alinharem.
- Código e valores técnicos: `--font-mono` (SF Mono onde houver).

## 2. Estilos

Escala dos estilos de texto do iOS (tamanho padrão), em rem. Pesos: regular 400, medium 500, semibold 600, bold 700.

| Estilo (`Text variant`) | Tamanho / linha | Peso | Tracking | Uso |
| --- | --- | --- | --- | --- |
| `display` | 48 / 52 | bold | +0,008 em | Página de venda, números de destaque |
| `large` | 34 / 41 | bold | +0,012 em | Título da tela |
| `title1` | 28 / 34 | semibold | +0,014 em | Título de seção grande |
| `title2` | 22 / 28 | semibold | −0,012 em | Título de seção |
| `title3` | 20 / 25 | semibold | −0,023 em | Título de cartão e diálogo |
| `body` | 16 / 23 | regular | −0,020 em | Texto corrido |
| `subhead` | 15 / 20 | regular | −0,016 em | Controles, listas, descrição |
| `footnote` | 13 / 18 | regular | −0,006 em | Ajuda, legendas, metadados |
| `caption` | 12 / 16 | regular | 0 | O menor tamanho permitido |

O tracking vem da tabela "SF Pro" da Apple (em milésimos de em por tamanho): texto médio é levemente apertado, títulos grandes levemente abertos. É isso que dá o ar "Apple".

## 3. Regras

- **Hierarquia por tamanho, peso e tom**, nessa ordem; nunca por cor de marca. Primário para o conteúdo, secundário para apoio, terciário só para placeholder.
- **Nada abaixo de 12 px.** Texto de leitura em 16, controles em 15, ajuda em 13.
- Poucos pesos por tela: normalmente regular e semibold. Light e ultra-finos não entram.
- Peso `medium` em botões, rótulos e itens de menu; `semibold` em títulos.
- Largura de leitura: no máximo `--width-text` (680 px), cerca de 70 caracteres por linha.
- Texto dimensionado em `rem`: respeita o tamanho de fonte escolhido pela pessoa no navegador (equivalente ao Dynamic Type).
