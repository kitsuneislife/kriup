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
| Material | `--color-bg-material`, `--blur-material` | Fundo translúcido do que flutua: menu, popover, tooltip, toast, lista do select |
| Linhas | `--color-row-alt` | Fundo das linhas alternadas de tabela e checklist |
| Preenchimentos | `--color-fill-subtle`, `--color-fill`, `--color-fill-strong` | Cinza com transparência: hover, pressionado, selecionado |
| Bordas | `--color-border`, `--color-border-strong`, `--color-hairline`, `--color-highlight`, `--color-edge` | Borda dupla: borda por fora, fio e brilho por dentro; `--color-edge` é o aro escuro externo do que flutua |
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
| `Button` | Qualquer ação. Uma `primary` por tela | Navegação dentro de texto corrido (use link) | `variant`: `primary`, `neutral`, `ghost`, `danger`; `size`; `icon`; só ícone; `loading`; `href`; `name` e `value` (o botão de envio pressionado manda o seu valor) |
| `TextField` | Texto de uma ou várias linhas | Escolha entre opções (use `Select`) | `type`, `size`, `icon`, `rows`, `hint`, `error`, `disabled`, `labelHidden` (rótulo só para leitor de tela, como numa busca), `inputmode` (teclado do celular) |
| `Select` | Escolher uma opção entre 4 ou mais | Duas ou três opções (use `SegmentedControl`) | `size`, `icon`, `hint`, `error` |
| `Field` | Dar rótulo, ajuda e erro a um controle novo | Quando `TextField` ou `Select` servem | `size`, `icon`, `multiline`, `labelHidden` |
| `Checkbox` | Marcar uma ou várias opções, em formulário | Efeito imediato (use `Switch`) | `hint`, `disabled` |
| `Switch` | Ligar ou desligar com efeito imediato | Item de formulário que só vale ao enviar | `hint`, `disabled` |
| `SegmentedControl` | Alternar entre 2 a 4 visões ou filtros; escolha curta num formulário (forma de pagamento) | Navegação entre páginas | `size`, `iconOnly`, `name` (envia a escolha com o formulário) |
| `Card` | Agrupar conteúdo relacionado | Envolver a página inteira | `variant`: `plain`, `frame` (borda dupla); `padding`; `selected`; `href` |
| `Badge` | Estado ou categoria curta | Texto longo, ação | `tone` (13), `size`, `dot` |
| `Avatar` | Pessoa ou conta | Logo de produto | `size`, `src` |
| `NavItem` | Item de menu lateral | Ação que não navega (use `Button`) | `current`, `icon`, `trailing` |
| `Alert` | Aviso no fluxo da página | Erro de um campo (use `error`) | `tone`: `info`, `success`, `warning`, `danger`; `action` |
| `Progress` | Etapa ou andamento | Espera sem fim conhecido em botão (use `loading`) | `value` ou indeterminado; `tone` |
| `Spinner` | Espera curta sem forma conhecida | Carregar conteúdo (use `Skeleton`) | `size` |
| `Skeleton` | Reservar o espaço do conteúdo que vai chegar | Ação do usuário (use `loading`) | `shape`: `text`, `block`, `circle`; `lines` |
| `Dialog` | Decisão que bloqueia a tela: confirmar, pedir um dado | Aviso que não exige resposta (use `Alert`) | `open`, `title`, `footer` |
| `Swatch` | Mostrar uma cor de token em `/design` e docs | Interface do produto | `token`, `name`, `light`, `dark`, `use`, `size`; o ladrilho mostra as duas metades, claro e escuro |
| `Showcase` | Seção de documentação em `/design`: título, quando usar e um palco para as variantes | Interface do produto | `description` e `note` com trechos em crases como código |
| `Disclosure` | Seção que abre e fecha: editor da página de vendas, perguntas frequentes | Conteúdo que precisa estar sempre visível | `icon`, `summary`, `open` |
| `EmptyState` | Lista ou tabela sem itens: diz o que fazer a seguir | Erro (use `Alert`) | `icon`, `action` |
| `Message` | Mensagem da conversa de um reembolso ou do suporte | Aviso do sistema (use `Alert`) | `own`, `time` |
| `Tabs` | Alternar entre painéis da mesma tela | Filtro que só muda a lista (use `SegmentedControl`) | `tabs` com `icon` e `count`; setas, Home e End |
| `Breadcrumb` | Mostrar onde a pessoa está em níveis de 3 ou mais | Menu principal | `items` |
| `Pagination` | Navegar entre páginas de uma lista longa | Lista curta ou rolagem infinita | `page`, `count` |
| `Stepper` | Etapas do assistente: criação do produto, checkout | Andamento em porcentagem (use `Progress`) | `steps`, `current` |
| `Menu` | Lista de ações de um item: editar, arquivar, sair | Navegação principal (use `NavItem`) | `items` com `icon`, `danger`, `disabled`, `separator`, `href`; `align` |
| `Popover` | Conteúdo extra preso a um botão: filtros, ajuda | Decisão que bloqueia (use `Dialog`) | `align`, `open` |
| `Tooltip` | Nome curto de um botão só com ícone | Informação essencial: ela precisa estar visível | `text`, `placement` |
| `Toast` | Confirmação rápida que some sozinha. Monte uma vez no layout e chame `toast.show` | Erro que exige ação (use `Alert`) | `tone`, `duration` |
| `Table` | Dados comparáveis em colunas: vendas, extrato, alunos | Poucos dados sem colunas (use `Card`) | `sort`, `loading`, `empty`, `cell`, `align` |
| `Timeline` | Histórico ou próximos passos: reembolso, liberações, auditoria | Lista sem ordem no tempo | `state`: `done`, `current`, `upcoming`; `tone`; `extra` |
| `Checklist` | Pendências com link para resolver | Etapas ordenadas (use `Stepper`) | `done`, `href`, `reason`, `count` |
| `Chart` | Tendência ou comparação simples, sem eixos | Dado que exige leitura exata (use `Table`) | `kind`: `line`, `bar`; `tone` |
| `LessonList` | Módulos e aulas do player do aluno | Lista de produtos | `current`, `done`, `duration`, `href` (cada aula vira link e funciona sem JavaScript) |
| `VideoFrame` | Moldura 16:9 do vídeo da aula | Imagem de capa | Slot para `video` ou `iframe` |
| `Money` | Todo valor em reais. Recebe centavos inteiros (RNF-01) | Número que não é dinheiro | `variant`, `tone`, `weight` |
| `DateTime` | Toda data e hora. Recebe UTC e mostra America/Sao_Paulo (RNF-11) | Datas escolhidas pela pessoa (use `TextField type="date"`) | `format`: `date`, `datetime`, `time`, `relative` |
| `Stat` | Número em destaque: saldo retido, liberado, sacado | Valor dentro de tabela (use `Money`) | `icon`, `tone`, `hint` |
| `StatusBadge` | Estado de pedido, reembolso ou saldo, com a cor certa | Categoria livre (use `Badge`) | `status` (15 estados), `size` |
| `FileUpload` | Logo e anexos: arrastar ou escolher | Imagem já enviada | `accept`, `maxBytes`, `multiple`, `error`, `onreject` |
| `BrandHero` | Topo da página de venda com a marca do produtor: prévia no assistente e página pública | Destaque com as cores do sistema (use `Card`) | `color` (o texto do botão vira preto ou branco para manter o contraste AA), `font`, `logoUrl`, `size`: `preview`, `page` (título vira o h1 e o botão leva a `href`) |
| `BrandScope` | Páginas do comprador (venda, checkout, pagamento): a cor e a fonte do produtor valem para os componentes dentro | Telas do produtor ou do sistema | `color` (vira o destaque; o texto do botão principal fica preto ou branco pelo contraste AA), `font` (carregada do Google Fonts) |
| `ColorField` | Cor da marca do produtor | Cor do sistema (use token) | `value` `#rrggbb`, `name`, `error` |
| `CopyField` | Texto para copiar: Pix copia e cola, link de afiliado | Texto que a pessoa edita | `copyLabel`, `copiedLabel` |

Formato da linha: o nome entre crases, igual à pasta e ao arquivo.

## Ainda não existe

Calendário com grade de dias (por ora, `TextField type="date"` usa o seletor do navegador), QR code do Pix (vem pronto do servidor como imagem) e avaliação por estrelas. Entram quando uma tela pedir, pelo fluxo do `README.md` seção 4, com padrões de `principios.md` seção 8.
