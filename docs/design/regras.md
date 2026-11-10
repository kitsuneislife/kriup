# Regras de uso do design kit

Valem para qualquer pessoa ou agente que mexa na interface. "Tela" é qualquer arquivo em `src/routes`. Quebrou uma regra, o PR não entra.

## Uso da biblioteca

- **R1. Biblioteca primeiro.** Tela só monta interface com componentes de `#lib/ui`. HTML cru é permitido para estrutura e texto (`div`, `section`, `main`, `h1`, `p`, `ul`, `a` etc.), nunca para controles: `button`, `input`, `select`, `textarea`, `dialog`, `table`.
- **R2. Uma porta de entrada.** Importe de `#lib/ui`. Nunca de `#lib/ui/Button/Button.svelte` ou de qualquer arquivo interno.
- **R3. Variante, não cópia.** Precisa de um jeito diferente de um componente que existe? Adicione uma `prop` tipada (`variant`, `size`, `tone`) nele. Não copie nem crie "Button2", "BigButton", "CardNew".
- **R4. Composição, não herança.** Peças maiores são feitas juntando peças menores do kit, com `children` e `snippet`s. Um componente do kit pode usar outro do kit, nunca o contrário de uma tela.
- **R5. Sem componente avulso.** Componente visual dentro de `routes/` é proibido. Se a tela precisa de uma peça nova, a peça nasce no kit (R9), mesmo que só uma tela a use no começo.

## Estilo

- **R6. Só tokens.** Cor, espaçamento, tipografia, raio, sombra, duração e `z-index` vêm de variáveis CSS de `tokens.css`. Nada de hex, `rgb()`, `px` solto de espaçamento ou fonte literal fora desse arquivo.
- **R7. Estilo dentro do componente.** O `<style>` fica no componente do kit. Tela não tem `<style>`, nem `style="..."`, nem classe própria. Layout de página usa os componentes de layout do kit.
- **R8. Sem estilo por fora.** Componentes não aceitam `class` nem `style` de quem usa. O que pode variar é exposto como prop.

## Criação e mudança

- **R9. Entrada só pelo fluxo.** Componente novo segue o fluxo de `README.md` seção 4: pasta própria, demo, exportação, catálogo, mesmo commit. O teste `structure.test.ts` falha se faltar demo ou catálogo.
- **R10. Demo completa.** A demo mostra todas as variantes, tamanhos e estados (normal, foco, desabilitado, carregando, erro, vazio) que o componente tem.
- **R11. Uma responsabilidade.** O componente faz uma coisa. Sem regra de negócio, sem acesso a banco, rede ou `$app`: recebe dados por `props` e avisa por callbacks.
- **R12. Tipado.** `props` com tipos explícitos, sem `any`. Valores fechados usam união de literais (`'primary' | 'secondary'`).
- **R13. Acessível por padrão.** Elemento semântico correto, rótulo para todo controle, foco visível, navegação por teclado, contraste conforme os tokens. Acessibilidade faz parte do "pronto", não é extra.
- **R14. Texto fora do componente.** O kit não tem texto fixo de produto. Rótulos e mensagens chegam por prop, como manda `tecnico/convencoes.md` seção 1.

## Medidas, layout e movimento

Detalhes e valores em `principios.md`.

- **R17. Só valores da escala.** Espaçamento, tamanhos, raios e tipografia saem das escalas fechadas dos tokens. Valor intermediário não existe; se falta um, a escala é revista para todos.
- **R18. Espaço é do pai.** Componente não tem `margin`. O `gap` vem de quem agrupa, por componentes de layout do kit.
- **R19. Nada muda seco.** Todo elemento que aparece, some, muda de estado, tamanho ou posição faz transição, com duração e curva dos tokens de movimento. A demo prova isso.
- **R20. Só `transform` e `opacity`.** Animação não mexe em largura, altura, `top` nem `left`. Respeita `prefers-reduced-motion`.
- **R21. Espera tem forma.** Carregamento usa esqueleto ou `loading` no próprio controle, com espaço reservado. Tela em branco e salto de layout são defeitos.
- **R22. Estados não mudam o tamanho.** Foco, carregando, erro e vazio ocupam o mesmo espaço do estado normal.
- **R23. Sem biblioteca de terceiros** de animação ou de componentes. Svelte, CSS e View Transitions bastam; exceção segue a seção "Exceções".
- **R24. Tema claro e escuro.** Todo token de cor tem os dois valores; a demo mostra os dois.

## Nomes e idioma

- **R15. Nomes em inglês, `PascalCase`**, o mesmo conceito com o mesmo nome em kit, código e catálogo (`Button`, `TextField`, `Card`). Props em `camelCase`.
- **R16. Catálogo em português.** `catalogo.md` explica quando usar e quando não usar cada componente.

## Exceções

Precisa fugir de uma regra? Abra a discussão no PR, com o motivo, antes de escrever o código. Se a exceção for aceita, a regra ou a lista de isenções em `eslint.config.js` é atualizada no mesmo PR. Sem exceção "só desta vez" escondida no código.
