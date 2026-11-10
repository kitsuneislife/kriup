# Design kit

O design kit é a única biblioteca de componentes visuais do sistema. Toda tela é montada com ele. Esta pasta documenta como o kit funciona: `principios.md` (direção visual, medidas, movimento), `regras.md` (regras de uso) e `catalogo.md` (o que existe).

Status: **base criada, sem componentes e sem estilo**. Os valores provisórios de `principios.md` aguardam as referências visuais. Os tokens e os primeiros componentes entram em commits próprios, seguindo o fluxo da seção 4.

## 1. Estrutura

| Caminho | Papel |
| --- | --- |
| `src/lib/ui/` | Biblioteca de componentes. Importada só por `#lib/ui` |
| `src/lib/ui/<Name>/<Name>.svelte` | O componente |
| `src/lib/ui/<Name>/<Name>.demo.svelte` | Demonstração com todas as variantes e estados |
| `src/lib/ui/index.ts` | Única porta de entrada: reexporta todos os componentes |
| `src/routes/design/` | Página que lista todas as demos, só em desenvolvimento |
| `docs/design/catalogo.md` | Índice de tokens e componentes, com quando usar cada um |
| `docs/design/regras.md` | Regras estritas de uso |

Estilo (quando existir) mora em `src/lib/ui/tokens.css` (tokens) e dentro de cada componente (`<style>` do Svelte). Nenhum outro lugar define cor, espaçamento, tipografia, raio ou sombra.

## 2. A página `/design`

- Descobre as demos sozinha (`import.meta.glob` em `**/*.demo.svelte`). Criar a demo já publica o componente na página, sem registro manual.
- Só responde em desenvolvimento (`dev`); em produção devolve 404.
- Serve de revisão visual: o componente só está pronto quando cada variante e estado aparece nela.

## 3. Garantias automáticas

| Regra | Onde é verificada |
| --- | --- |
| Todo componente tem demo e entrada no catálogo | `src/lib/ui/structure.test.ts` (roda em `pnpm test`) |
| Telas não usam `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>`, `<table>` cru | ESLint (`svelte/no-restricted-html-elements`) em `src/routes` |
| Telas importam só de `#lib/ui`, nunca de um arquivo interno | ESLint (`no-restricted-imports`) |
| O kit não importa `routes`, `server`, `domain` nem `$app` | ESLint (`no-restricted-imports`) em `src/lib/ui` |

Telas anteriores ao kit (`login`, `register`, `account`) ficam isentas do bloqueio de elementos crus até serem migradas. A lista de isenções está em `eslint.config.js`; ela só encolhe.

## 4. Fluxo para criar ou mudar um componente

1. **Procure antes.** Consulte `catalogo.md`. Se algo existente resolve, use-o. Se resolve quase, estenda com uma variante (regra R3).
2. **Justifique.** Só crie um componente novo se a mesma peça aparece em duas ou mais telas, ou é uma peça básica da interface. Registre o motivo na descrição do PR.
3. **Crie a pasta** `src/lib/ui/<Name>/` com `<Name>.svelte` e `<Name>.demo.svelte`.
4. **Exporte** em `src/lib/ui/index.ts`.
5. **Documente** no `catalogo.md`: nome, quando usar, quando não usar, variantes.
6. **Verifique:** `pnpm lint`, `pnpm check`, `pnpm test`, e olhe a página `/design`.

Componente, demo, exportação e catálogo entram no mesmo commit.
