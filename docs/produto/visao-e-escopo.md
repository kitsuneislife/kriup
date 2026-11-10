# Visão e escopo do MVP

> Status: rascunho v0.1. Itens marcados como **(hipótese)** ainda precisam de validação. Base: `../pesquisa/lean-canvas-matriz-de-dores.md`.

## 1. Visão

Uma plataforma de infoprodutos em que qualquer pessoa monta sozinha um produto digital completo e bonito, e vê para onde vai cada real e cada reembolso.

A referência é o Canva: manter o poder de uma ferramenta profissional e tirar a barreira de entrada para quem não é técnico.

## 2. Problema que o MVP ataca

| # | Dor | Perfil | Aposta do MVP |
| --- | --- | --- | --- |
| P1 | Montar produto bonito e completo exige conhecimento técnico ou freelancer | Produtor | Criação guiada com modelos |
| P2 | Dinheiro retido ou conta bloqueada sem explicação | Produtor | Painel de dinheiro transparente |
| P3 | Reembolso e suporte sem responsável claro | Aluno | Reembolso e suporte na área do aluno |
| P4 | Divisão de receita pouco clara | Coprodutor | Contrato digital e extrato por parte |

## 3. Perfis (personas)

| Perfil | Quem é | O que precisa |
| --- | --- | --- |
| Produtor | Iniciante ou de pequeno porte, sem time técnico, vende curso, mentoria ou assinatura | Publicar o primeiro produto rápido e entender seu saldo |
| Aluno | Comprador do produto | Receber o acesso, saber o status de um reembolso e a quem recorrer |
| Coprodutor | Parceiro do produtor com participação nas vendas | Saber quanto recebe e por quê |
| Suporte da plataforma | Equipe interna (no MVP, o próprio grupo) | Mediar reembolsos parados e bloqueios |

## 4. Escopo

### Dentro do MVP

1. Criação guiada de produto a partir de modelo (página de venda, checkout, área de membros, e-mails, política de reembolso).
2. Venda: checkout com Pix e cartão **simulados** por um adaptador de pagamento (ver `../tecnico/arquitetura.md`).
3. Entrega: liberação automática do acesso após pagamento confirmado e área de membros com aulas.
4. Reembolso: pedido pelo aluno, status visível, responsável e prazo.
5. Painel de dinheiro: saldo retido, liberado e pago, com motivo e data de liberação.
6. Coprodução: convite, contrato digital com aceite e extrato por parte.

### Fora do MVP

- Afiliados e marketplace.
- Gamificação.
- Meio de pagamento próprio e antecipação de recebíveis.
- Emissão de nota fiscal.
- App mobile nativo e white-label completo (domínio próprio).
- IA (copy, trilhas, insights).

## 5. Premissas e restrições

- Projeto acadêmico (Startup, ADS, Senac), construído em **SvelteKit**.
- Pagamento real não é cobrado: o MVP usa um provedor simulado. Isso evita lidar com dados de cartão e conformidade financeira.
- Vídeo não é hospedado pela plataforma: a aula guarda a URL de um player externo (YouTube não listado, Vimeo ou Bunny).
- **Em aberto:** prazo da apresentação e número de pessoas do grupo.

## 6. Métricas de sucesso

Vêm do Lean Canvas e viram eventos medidos no sistema (ver `regras-de-negocio.md`, seção Métricas):

- Tempo até publicar o primeiro produto.
- Percentual de produtos criados que chegam a ser publicados.
- Tempo até a primeira resposta a um pedido de reembolso.
- Contatos de suporte por produtor.

## 7. Glossário

| Termo | Definição |
| --- | --- |
| Produto | O que o produtor vende: curso, mentoria ou assinatura |
| Oferta | Preço e condições de um produto (valor, garantia) |
| Pedido | Uma compra de uma oferta por um aluno |
| Matrícula | O direito de acesso do aluno a um produto, criado após o pagamento |
| Lançamento | Registro financeiro imutável que muda o saldo de alguém |
| Retenção | Valor pago mas ainda não liberado, com motivo e data de liberação |
| Garantia | Prazo em que o aluno pode pedir reembolso sem justificar (7 dias, ver RN-03) |
| Coprodução | Acordo de divisão da receita do produtor com outra pessoa |
