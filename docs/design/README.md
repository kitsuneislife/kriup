# Design kit

O design kit é a única biblioteca de componentes visuais do sistema. Toda tela é montada com ele. Esta pasta documenta como o kit funciona: `principios.md` (direção visual, medidas, movimento), `regras.md` (regras de uso) e `catalogo.md` (o que existe).

Status: **tokens, base de estilo e 49 componentes prontos**: layout, texto, ícones, formulário, feedback, navegação (abas, menu, popover, tooltip, toast), dados (tabela, linha do tempo, gráfico) e peças do sistema (dinheiro, data, estado, upload). Falta o calendário com grade de dias e o que as telas ainda pedirem, pelo fluxo da seção 4.

Leitura, nesta ordem: `principios.md` (direção), `cores.md`, `tipografia.md`, `regras.md`, `catalogo.md`.

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

Estilo mora em `src/lib/ui/tokens.css` (tokens), `src/lib/ui/base.css` (reset e fonte, carregados por `index.ts`) e dentro de cada componente (`<style>` do Svelte). Nenhum outro lugar define cor, espaçamento, tipografia, raio ou sombra. Claro e escuro usam `light-dark()`: o tema segue o sistema e `data-theme` em `<html>` força um deles.

## 2. A página `/design`

- Descobre as demos sozinha (`import.meta.glob` em `**/*.demo.svelte`). Criar a demo já publica o componente na página, sem registro manual.
- Só responde em desenvolvimento (`dev`); em produção devolve 404.
- Cada demo vira uma seção `Showcase`. O texto de "quando usar" e "evite" vem da linha do componente no `catalogo.md`, então o catálogo é a única fonte dessas frases.
- A busca da barra lateral filtra por nome, título, grupo e uso, e fica na URL (`/design?q=Table`), o que serve para abrir ou fotografar uma seção sozinha.
- A barra lateral marca a seção visível enquanto a página rola.
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
