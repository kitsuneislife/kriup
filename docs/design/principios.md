# Princípios de design

Direção visual e padrões de consistência do sistema. Os **princípios e regras** abaixo estão decididos. Os **valores numéricos** marcados como _provisório_ são ponto de partida e serão fechados quando as referências visuais chegarem; ao fechar, o valor vira token em `src/lib/ui/tokens.css` e é registrado em `catalogo.md`.

## 1. Direção

- **Limpo e minimalista.** Conteúdo em primeiro lugar. Cada elemento na tela precisa ter motivo; na dúvida, tire.
- **Inspirado no design da Apple.** Muito espaço em branco, tipografia como principal elemento visual, cantos arredondados contínuos, pouca cor, profundidade sutil (sombra suave, translucidez só quando ajuda).
- **Rápido, suave, fluido.** Velocidade percebida é requisito de design. Nada aparece, some ou se mexe "seco".
- **Ultra-consistente.** A mesma coisa sempre tem o mesmo tamanho, canto, espaçamento e comportamento. Se duas telas resolvem o mesmo problema de jeitos diferentes, uma delas está errada.

## 2. Tokens em camadas

1. **Primitivos:** valores brutos (`--blue-500`, `--space-4`). Só `tokens.css` os conhece.
2. **Semânticos:** papel na interface (`--color-text`, `--color-surface`, `--color-accent`, `--space-gap-md`). É o que os componentes usam.
3. **De componente:** só quando o componente precisa de um ajuste próprio (`--button-height`). Nasce apontando para um semântico.

Claro e escuro desde o início: todo token de cor semântico tem os dois valores. Componente nunca assume um tema.

## 3. Medidas

Tudo cai numa escala fechada. Valor fora da escala não existe.

| Item | Regra | Valores _provisório_ |
| --- | --- | --- |
| Espaçamento | Base de 4 px, escala fixa | 4, 8, 12, 16, 24, 32, 48, 64, 96 |
| Altura de controle | 3 tamanhos (`sm`, `md`, `lg`), alvo de toque mínimo de 44 px no `md` e `lg` em telas de toque | 32, 40, 48 |
| Raio | Escala curta; raio interno = raio externo menos o espaçamento (cantos concêntricos) | 8, 12, 16, 24, pílula |
| Tipografia | Fonte do sistema (carrega na hora, sem salto); poucos tamanhos e pesos; altura de linha por tamanho | 12, 14, 16, 20, 28, 40 / pesos 400, 500, 600 |
| Largura de conteúdo | Máximos fixos por tipo de página | texto 680, página 1120 |
| Ícones | Um só conjunto, traço uniforme, tamanhos atrelados aos de controle | 16, 20, 24 |
| Sombra e camadas | Poucos níveis nomeados, `z-index` só por token | 3 níveis |

## 4. Layout e alinhamento

- **O espaço entre coisas é do pai.** Quem agrupa define o `gap`. Componente nunca traz `margin` própria; assim ele se encaixa em qualquer lugar sem ajuste.
- **Layout por componentes de layout** (`Stack`, `Cluster`, `Grid`, `Page`, `Section`), com `gap` vindo da escala. Tela não escreve CSS de layout.
- **Tudo alinhado.** Bordas e textos se alinham à grade; ícone e texto se alinham pela linha de base ou centro óptico, nunca "no olho".
- **Hierarquia por tipografia e espaço**, antes de cor, borda ou caixa. Uma ação primária por tela; as demais ficam em segundo plano.
- **Responsivo por padrão.** Mobile primeiro, poucos pontos de quebra (definidos nos tokens), sem rolagem horizontal.
- **Estados nunca mudam o tamanho.** Foco, carregando, erro e vazio ocupam o mesmo espaço do estado normal, para o layout não pular.

## 5. Movimento

Movimento é parte do sistema, não enfeite. Valem para todo componente e toda tela.

- **Nada muda "seco".** Todo elemento que aparece, some, muda de estado, de tamanho ou de posição faz transição. Isso inclui listas, abas, modais, menus, alertas, valores que mudam e troca de página.
- **Rápido.** Resposta ao toque ou clique em até 100 ms. Transições comuns entre 150 e 250 ms; as maiores (página, modal) até 350 ms. Nada passa de 400 ms.
- **Suave e natural.** Entrada com curva de desaceleração, saída mais rápida que a entrada, movimento contínuo (a Apple usa molas; aqui, curvas equivalentes). Sem efeito de "quicar" exagerado.
- **Interrompível.** Uma animação em curso pode ser revertida a qualquer momento, sem travar nem pular.
- **Barato para o navegador.** Anime só `transform` e `opacity` (e filtros leves); nunca largura, altura, `top` ou `left`. Respeite `prefers-reduced-motion`: com ele ligado, troque movimento por esmaecer rápido.
- **Tokens de movimento.** Duração e curva vêm de tokens (`--duration-fast`, `--duration-base`, `--duration-slow`, `--ease-enter`, `--ease-exit`, `--ease-standard`). Valor solto de `ms` ou `cubic-bezier` fora de `tokens.css` é proibido.
- **Escalonar com moderação.** Entrada em sequência de itens só até 8 itens, com intervalo curto.

### Carregamento e espera

- Nunca tela em branco: use esqueleto (`Skeleton`) com o formato final do conteúdo, que se dissolve para o conteúdo real.
- Espaço reservado antes de chegar o dado, para não haver salto de layout (CLS zero).
- Ação do usuário responde na hora: estado otimista ou indicador de progresso no próprio botão (`loading`), sem bloquear a tela.
- Indicadores só aparecem após um atraso curto (cerca de 150 ms), para não piscar em respostas rápidas.

### Transições entre páginas

- Navegação usa a View Transitions API do navegador (via `onNavigate` do SvelteKit), com esmaecer e leve deslocamento; elementos compartilhados entre telas mantêm continuidade.
- Navegação pré-carrega ao passar o mouse (já configurado em `app.html`) para parecer instantânea.
- Sem a API disponível, a troca é direta, sem quebrar nada.

## 6. Desempenho como requisito de design

- Sem biblioteca de animação ou de componentes de terceiros: transições do Svelte, CSS e View Transitions.
- Fonte do sistema, ícones em SVG inline, imagens com dimensões declaradas e carregamento preguiçoso.
- Orçamento (_provisório_): LCP até 1,5 s, INP até 100 ms, CLS 0.
- Todo componente novo é verificado em CPU lenta e com movimento reduzido.

## 7. "Design intelligence": como decidir

Antes de criar ou mudar qualquer peça de interface, responda na descrição do PR:

1. Que problema do usuário isto resolve, e o que dá para **remover** da tela em vez de acrescentar?
2. Já existe componente no `catalogo.md` que serve? (regra R1 e R3)
3. Usa só valores da escala e só tokens?
4. Todos os estados e o movimento estão na demo?
5. Funciona com teclado, leitor de tela, tema escuro, movimento reduzido e celular?
