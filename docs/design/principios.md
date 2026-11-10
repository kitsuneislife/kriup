# Princípios de design

Direção visual e padrões de consistência do sistema. As referências são as Human Interface Guidelines da Apple (cor, tipografia, ícones, layout, movimento) e o visual do Lovable (cinzas, borda dupla, seleção, botões com gradiente). Os valores abaixo já são tokens em `src/lib/ui/tokens.css`, listados em `catalogo.md`. Detalhes: `cores.md` e `tipografia.md`.

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

| Item | Regra | Valores |
| --- | --- | --- |
| Espaçamento | Base de 4 px, escala fixa | 4, 8, 12, 16, 24, 32, 48, 64, 96 |
| Altura de controle | 3 tamanhos (`sm`, `md`, `lg`). Em telas de toque, alvo mínimo de 44 px no `md` e no `lg` | 32, 40, 48 |
| Raio | Escala curta; raio interno = raio externo menos o espaçamento (cantos concêntricos). Controles de uma linha são pílula | 6, 8, 12, 16, 24, pílula |
| Tipografia | Estilos de texto da Apple, tracking da tabela SF Pro (ver `tipografia.md`) | 12, 13, 15, 16, 20, 22, 28, 34, 48 / pesos 400 a 700 |
| Largura de conteúdo | Máximos fixos por tipo de página | texto 680, página 1120, barra lateral 260 |
| Ícones | Um só conjunto, traço de 1,75, pontas arredondadas; tamanho atrelado ao texto | 16, 20, 24 |
| Sombra e camadas | Poucos níveis nomeados, `z-index` só por token | 3 sombras, 4 camadas |
| Pontos de quebra | Só dois, escritos no `Shell`, no `Grid` e em `tokens.css` | 40rem, 64rem |

## 4. Layout e alinhamento

- **O espaço entre coisas é do pai.** Quem agrupa define o `gap`. Componente nunca traz `margin` própria; assim ele se encaixa em qualquer lugar sem ajuste.
- **Layout por componentes de layout** (`Shell`, `Page`, `Stack`, `Cluster`, `Grid`), com `gap` vindo da escala. Tela não escreve CSS de layout.
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
- Única exceção de terceiros: a fonte Inter (`@fontsource-variable/inter`), servida do próprio site e só usada fora dos dispositivos Apple.
- Orçamento (_provisório_): LCP até 1,5 s, INP até 100 ms, CLS 0.
- Todo componente novo é verificado em CPU lenta e com movimento reduzido.

## 7. "Design intelligence": como decidir

Antes de criar ou mudar qualquer peça de interface, responda na descrição do PR:

1. Que problema do usuário isto resolve, e o que dá para **remover** da tela em vez de acrescentar?
2. Já existe componente no `catalogo.md` que serve? (regra R1 e R3)
3. Usa só valores da escala e só tokens?
4. Todos os estados e o movimento estão na demo?
5. Funciona com teclado, leitor de tela, tema escuro, movimento reduzido e celular?

## 8. O que absorvemos da Apple e do Lovable

**Da Apple (HIG)**

- _Color:_ cor com significado único, três níveis de fundo, texto por opacidade, contraste aumentado. Ver `cores.md`.
- _Typography:_ estilos de texto com altura de linha e tracking próprios, hierarquia por peso e tom, nada abaixo de 12 px. Ver `tipografia.md`.
- _Icons:_ um só traço para todos, peso igual ao do texto ao lado, formas simples e reconhecíveis, sem misturar contorno e preenchido.
- _Layout:_ importante primeiro (topo e início), alinhar para facilitar a leitura, agrupar por espaço e separador, margens consistentes, alvos de toque de 44 px, cantos concêntricos.
- _Motion:_ movimento com propósito, curto e preciso, cancelável, nunca o único meio de informar, e opcional (`prefers-reduced-motion`). Em ações muito frequentes, quase nenhum movimento.
- _Patterns, components, inputs:_ rótulo sempre visível acima do campo, ajuda e erro no lugar da ajuda, um controle para cada tipo de escolha (duas a quatro opções: `SegmentedControl`; liga/desliga imediato: `Switch`; várias marcações em formulário: `Checkbox`), confirmação só para ação destrutiva ou irreversível (`Dialog`), carregamento com esqueleto, retorno imediato a cada toque.

**Do Lovable**

- Cinzas em camadas, bordas de um pixel em vez de sombras fortes, e a **borda dupla** como assinatura (`cores.md` seção 3).
- Controles de uma linha em pílula; cartões e painéis com cantos grandes.
- Seleção clara: preenchimento cinza no item de menu e na aba, borda e halo de acento nos cartões.
- Botões com borda mais clara e gradiente discreto, que dão relevo sem virar "botão antigo".
- Barra lateral sobre o fundo, conteúdo em painel arredondado afastado das bordas (`Shell`).
- Fluidez: tudo responde ao toque, nada aparece seco.

## 9. Superfícies e detalhes

- **Botão de cor.** `primary` e `danger` usam o tom um degrau mais escuro, gradiente curto, aro mais claro e um brilho fino no topo. Relevo sem brilho de plástico; o texto branco fica calmo.
- **Cor pontual, superfície neutra.** `Alert` e `Toast` não tingem o cartão inteiro: a cor vai num ícone sólido e numa luz suave que sai dele, como uma notificação do macOS.
- **Volume nos pequenos.** `Badge`, ícone do `Stat`, marcas de `Checklist`, `LessonList`, `Stepper` e pontos da `Timeline` têm gradiente vertical, aro no tom e brilho no topo. Nada de chapado.
- **Material flutuante.** Menu, popover, tooltip, toast e a lista do select usam `--color-bg-material` com `--blur-material` e borda dupla justa: aro claro por dentro, `--color-edge` escuro por fora.
- **Linhas alternadas.** Tabela e checklist alternam o fundo das linhas com `--color-row-alt`, como no Finder e no Numbers, em vez de linhas divisórias.
- **Elementos nativos.** `base.css` veste o que o navegador desenha: barra de rolagem fina, seleção, cursor de texto, `accent-color`, autofill, ícone de data e hora, spinners de número, botão de arquivo, `range`, `kbd`, `mark`, `code`, `hr` e `abbr`. O `Select` usa `appearance: base-select` para desenhar a própria lista; navegadores sem suporte mostram a lista do sistema.
- **Entrada e saída.** Painéis flutuantes abrem com queda curta e escala e fecham mais rápido que abrem (`@starting-style` e `display` com `allow-discrete`). `Disclosure` anima a altura com `::details-content`. Toasts sobem ao entrar, encolhem ao sair e os outros deslizam para o lugar.
