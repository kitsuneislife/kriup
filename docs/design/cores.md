# Cores

Base: a paleta de sistema da Apple, nos valores _Default (light)_ e _Default (dark)_ das tabelas de referência. Os tokens estão em `src/lib/ui/tokens.css`; `/design`, seção "Cores", mostra todos, com os valores RGB, nos dois temas.

Fundamento (HIG, _Color_): cor tem significado e o mesmo significado em todo lugar; cada cor precisa funcionar no claro, no escuro e com contraste aumentado; use pouca cor, a interface é feita de cinzas e o resto é exceção.

## 1. Regra de ouro: uma cor, um significado

| Cor | Significado no sistema | Onde aparece |
| --- | --- | --- |
| **Blue** | Acento: o que o usuário pode fazer ou escolher | Botão primário, link, seleção, foco, passo atual |
| **Green** | Concluído e dinheiro disponível | Pagamento confirmado, saldo liberado, `Switch` ligado |
| **Orange** | Em espera, exige atenção | Saldo retido, pagamento pendente, prazo perto |
| **Red** | Falhou ou é irreversível | Erro, pagamento recusado, botão de excluir |
| **Indigo** | Dinheiro voltando | Reembolso (não é erro, por isso não é vermelho) |
| **Purple** | Parceria | Coprodução, coprodutor |
| **Pink** | Novidade e marca | Destaques raros: "novo", avatar, ilustração |
| **Yellow** | Destaque leve | Estrela, nota, aviso sem urgência |
| **Cyan** | Informação neutra | `Alert` informativo, dica |
| **Teal, Mint, Brown** | Só categoria | Séries de gráfico e etiquetas de categoria; nunca estado |
| **Grays** | Estrutura | Fundos, bordas, texto de apoio, preenchimentos |

Consequências:

- Azul nunca indica estado, e verde, laranja e vermelho nunca indicam clique. Link não é verde; "sucesso" não é azul.
- A cor nunca é o único sinal: todo estado tem texto (`Badge` com ponto, ícone no `Alert`).
- Texto de status usa a variante escurecida no tema claro (`Text tone`, `Badge`), porque verde, amarelo e laranja puros não têm contraste suficiente sobre branco.
- A paleta dos gráficos segue a ordem: blue, indigo, teal, orange, pink, mint, purple, yellow. Estado nunca é codificado só pela cor do gráfico.

## 2. Estrutura: cinzas e três níveis de superfície

A Apple separa fundos em primário, secundário e terciário, e o Lovable usa o mesmo princípio com bordas finas. Aqui:

| Nível | Token | Claro | Escuro | Uso |
| --- | --- | --- | --- | --- |
| 0, fundo do app | `--color-bg-app` | Gray 6 | Gray 6 escurecido | Barra lateral, atrás do painel |
| 1, painel | `--color-bg-panel` | branco | Gray 6 | Conteúdo da tela |
| 2, elevado | `--color-bg-raised` | branco | Gray 5 | Cartões, diálogos, botões neutros |
| Campo | `--color-bg-field` | branco | Gray 6 mais claro | Entradas de texto |

Regras:

- **Profundidade pelo tom, não pela sombra.** No escuro, camada mais alta é mais clara. No claro, o painel branco se destaca do fundo cinza. A sombra é só um reforço sutil.
- **Preenchimentos são cinza com transparência** (`--color-fill-*`): hover, pressionado e selecionado funcionam sobre qualquer superfície sem cor nova.
- **Texto por opacidade**, como na Apple: primário, secundário (76% no claro, 60% no escuro), terciário (30%, só placeholder e desabilitado) e quaternário (decoração). O secundário claro foge dos 60% da Apple porque eles dão 3,3:1 sobre o fundo do app, abaixo do mínimo AA de 4,5:1; com 76% fica em 5:1. Texto que a pessoa precisa ler nunca usa o terciário.
- **Contraste aumentado:** com `prefers-contrast: more` os cinzas assumem os valores "Increased contrast" da paleta.

## 3. Borda dupla

Assinatura visual do sistema, tirada do Lovable. Duas linhas finas em tons de cinza diferentes, uma por fora e outra por dentro, criam relevo sem sombra pesada.

- `Card variant="frame"`: carcaça (preenchimento sutil + `--color-border`) e superfície interna (`--color-border` + brilho `--color-highlight` na borda de cima). O raio interno é o externo menos o espaço entre as duas (cantos concêntricos).
- `Dialog`: mesma construção, um degrau maior.
- Botões: anel externo escuro (`0 0 0 1px`) e borda interna mais clara, com brilho no topo.
- Seleção: borda de acento mais um halo de 3 px de azul a 14% (`--color-accent-tint`).

## 4. Botões

- **Primário e perigo:** gradiente vertical da própria cor (24% de branco misturado no topo), borda mais clara que o fundo, brilho `--glint` na primeira linha e anel escuro por fora. Hover clareia, pressionado escurece e encolhe levemente (`--press-scale`).
- **Neutro:** gradiente de papel (`--button-neutral-*`), borda cinza e anel fino. É o botão padrão; **uma ação primária por tela**.
- **Fantasma:** sem fundo, só preenchimento no hover. Para ações de baixa ênfase.
- O verde do `Switch` segue a Apple: ligado é verde, porque significa "ativo agora", não "ação".

## 5. Cores de ações no tema claro e escuro

Os valores da paleta mudam entre os temas (o escuro é um pouco mais claro e saturado). Por isso:

1. Componentes nunca citam um valor, só `var(--blue)` ou um token semântico.
2. Tom escurecido de texto: `color-mix(in oklab, preto 40%, cor)` no claro, a cor pura no escuro.
3. Toda cor nova entra em `tokens.css` com os dois valores (`light-dark(claro, escuro)`).
