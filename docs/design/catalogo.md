# Catálogo do design kit

Consulte este arquivo antes de criar qualquer coisa (regra R1 e R3). Cada componente do kit tem uma linha na tabela de componentes; o teste `src/lib/ui/structure.test.ts` falha se faltar. Veja tudo funcionando em `/design` (só em desenvolvimento).

## Tokens

Todos em `src/lib/ui/tokens.css`. O porquê das cores está em `cores.md`; a tipografia, em `tipografia.md`.

| Grupo | Tokens | Significado |
| --- | --- | --- |
| Cores do sistema | `--red` `--orange` `--yellow` `--green` `--mint` `--teal` `--cyan` `--blue` `--indigo` `--purple` `--pink` `--brown` | Paleta Apple, padrão claro e escuro. Só `tokens.css` e `Swatch` os citam; componentes usam os semânticos |
| Cinzas | `--gray` a `--gray-6` | Estrutura: bordas, fundos e preenchimentos |
| Texto | `--color-text`, `-secondary`, `-tertiary`, `-quaternary`, `-on-accent`, `--color-link` | Hierarquia por opacidade, como na Apple |
| Superfícies | `--color-bg-app` < `--color-bg-panel` < `--color-bg-raised`, `--color-bg-field`, `--color-bg-overlay` | Três níveis de profundidade, do fundo ao cartão |
| Preenchimentos | `--color-fill-subtle`, `--color-fill`, `--color-fill-strong` | Cinza com transparência: hover, pressionado, selecionado |
| Bordas | `--color-border`, `--color-border-strong`, `--color-hairline`, `--color-highlight` | Borda dupla: borda por fora, fio e brilho por dentro |
| Significado | `--color-accent`, `-success`, `-warning`, `-danger`, `-info` | Azul age, verde liberou, laranja espera, vermelho falhou |
| Espaçamento | `--space-1` a `--space-24` (4, 8, 12, 16, 24, 32, 48, 64, 96) | Escala fechada |
| Raio | `--radius-xs` a `--radius-xl`, `--radius-pill` | Interno = externo menos o preenchimento |
| Controles | `--control-sm` `-md` `-lg` (32, 40, 48), `--icon-sm` `-md` `-lg` (16, 20, 24) | Alturas e ícones atrelados |
| Tipografia | `--text-<estilo>-size/-leading/-tracking`, `--weight-*`, `--font-sans`, `--font-mono` | Estilos de texto da Apple, com o tracking da tabela SF Pro |
| Elevação | `--shadow-1` a `--shadow-3` | Cartão, menu, diálogo |
| Camadas | `--z-sticky` `--z-overlay` `--z-popover` `--z-toast` | Único lugar de `z-index` |
| Movimento | `--duration-fast/base/slow` (150, 220, 340 ms), `--ease-standard/enter/exit/spring`, `--shift`, `--press-scale` | Ver `principios.md` seção 5 |

## Componentes

| Componente | Quando usar | Quando não usar | Variantes |
| --- | --- | --- | --- |
| `Page` | Envolver o conteúdo de uma tela: centraliza e limita a largura | Dentro de outro `Page` | `width`: `text`, `page` |
| `Shell` | Moldura do app: barra lateral e painel de conteúdo | Telas públicas curtas (login, checkout) | Slot `sidebar` |
| `Stack` | Empilhar itens na vertical com espaço da escala | Itens lado a lado (use `Cluster`) | `gap`, `align`, `as` |
| `Cluster` | Itens em linha que quebram sozinhos: ações, etiquetas, cabeçalho | Colunas de largura igual (use `Grid`) | `gap`, `align`, `justify`, `wrap` |
| `Grid` | Cartões em colunas que se ajustam à largura | Poucos itens em linha (use `Cluster`) | `min`: `sm`, `md`, `lg`; `gap` |
| `Divider` | Separar blocos que o espaço sozinho não separa | Como decoração | `orientation` |
| `Text` | Todo texto: dá estilo, peso e tom | Texto dentro de componente que já o formata | `variant` (9 estilos), `weight`, `tone`, `numeric`, `truncate` |
| `Icon` | Ícone do conjunto do kit | SVG solto em tela | `name`, `size`, `label` |
| `Button` | Qualquer ação. Uma `primary` por tela | Navegação dentro de texto corrido (use link) | `variant`: `primary`, `neutral`, `ghost`, `danger`; `size`; `icon`; só ícone; `loading`; `href` |
| `TextField` | Texto de uma ou várias linhas | Escolha entre opções (use `Select`) | `type`, `size`, `icon`, `rows`, `hint`, `error`, `disabled` |
| `Select` | Escolher uma opção entre 4 ou mais | Duas ou três opções (use `SegmentedControl`) | `size`, `icon`, `hint`, `error` |
| `Field` | Dar rótulo, ajuda e erro a um controle novo | Quando `TextField` ou `Select` servem | `size`, `icon`, `multiline` |
| `Checkbox` | Marcar uma ou várias opções, em formulário | Efeito imediato (use `Switch`) | `hint`, `disabled` |
| `Switch` | Ligar ou desligar com efeito imediato | Item de formulário que só vale ao enviar | `hint`, `disabled` |
| `SegmentedControl` | Alternar entre 2 a 4 visões ou filtros | Navegação entre páginas | `size`, `iconOnly` |
| `Card` | Agrupar conteúdo relacionado | Envolver a página inteira | `variant`: `plain`, `frame` (borda dupla); `padding`; `selected`; `href` |
| `Badge` | Estado ou categoria curta | Texto longo, ação | `tone` (13), `size`, `dot` |
| `Avatar` | Pessoa ou conta | Logo de produto | `size`, `src` |
| `NavItem` | Item de menu lateral | Ação que não navega (use `Button`) | `current`, `icon`, `trailing` |
| `Alert` | Aviso no fluxo da página | Erro de um campo (use `error`) | `tone`: `info`, `success`, `warning`, `danger`; `action` |
| `Progress` | Etapa ou andamento | Espera sem fim conhecido em botão (use `loading`) | `value` ou indeterminado; `tone` |
| `Spinner` | Espera curta sem forma conhecida | Carregar conteúdo (use `Skeleton`) | `size` |
| `Skeleton` | Reservar o espaço do conteúdo que vai chegar | Ação do usuário (use `loading`) | `shape`: `text`, `block`, `circle`; `lines` |
| `Dialog` | Decisão que bloqueia a tela: confirmar, pedir um dado | Aviso que não exige resposta (use `Alert`) | `open`, `title`, `footer` |
| `Swatch` | Mostrar uma cor de token em `/design` e docs | Interface do produto | `token`, `scheme`, `value` |

Formato da linha: o nome entre crases, igual à pasta e ao arquivo.

## Ainda não existe

Menu e popover, tooltip, abas, tabela, toast, calendário, upload, gráfico. Entram quando uma tela pedir, pelo fluxo do `README.md` seção 4, com padrões de `principios.md` seção 8.
