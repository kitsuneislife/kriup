# 1. Introdução e contextualização

> **Summary.** Apresenta o {{PRODUTO}}, uma plataforma de venda de produtos
> digitais (cursos, mentorias, assinaturas) para quem não tem time técnico. Cobre
> a ideia e os objetivos, as dores encontradas na pesquisa, a solução, o modelo de
> receita e os concorrentes. Base: `../pesquisa/lean-canvas-matriz-de-dores.md`
> e `../produto/visao-e-escopo.md`.

## 1.1 Apresentação do projeto

### Ideia

O {{PRODUTO}} é uma plataforma de infoprodutos em que qualquer pessoa monta sozinha um produto digital completo e bonito, e vê para onde vai cada real e cada reembolso.

Infoproduto é o produto digital vendido pela internet: curso gravado, mentoria, workshop ou clube de assinatura. No Brasil esse mercado roda sobre plataformas como Hotmart, Kiwify e Cakto, que cuidam do checkout, do pagamento, da área de membros e do repasse ao produtor.

A referência de partida é o Canva. O Canva não inventou o design gráfico; ele tirou a barreira de entrada para quem não é designer. O {{PRODUTO}} tenta fazer o mesmo com a venda de produtos digitais: manter o que uma ferramenta profissional faz e tirar a parte que hoje exige um técnico ou um freelancer.

### Objetivo geral

Construir e validar um MVP (produto mínimo viável) de plataforma de infoprodutos que ataque as quatro dores mais repetidas na pesquisa: montar o produto sem ajuda técnica, entender o dinheiro retido, ter um responsável claro pelo reembolso e saber como a receita é dividida entre parceiros.

### Objetivos específicos

1. Permitir que o produtor crie um produto a partir de um modelo pronto, respondendo poucas perguntas, e publique sem conhecimento técnico.
2. Vender por Pix e cartão, liberar o acesso do aluno automaticamente após o pagamento e entregar o conteúdo numa área de membros.
3. Mostrar ao produtor um painel de dinheiro em que todo valor retido tem motivo e data de liberação.
4. Dar ao aluno um pedido de reembolso com status, responsável e prazo sempre visíveis.
5. Registrar a coprodução por contrato digital aceito e mostrar a cada parte o extrato da sua fatia.
6. Medir no próprio sistema as métricas do Lean Canvas: tempo até publicar o primeiro produto, taxa de publicação, tempo até a primeira resposta a um reembolso e contatos de suporte por produtor.

### Situação atual

O MVP está implementado e testado: 276 testes unitários, 129 de integração e 289 de ponta a ponta aprovados, com as páginas públicas carregando entre 376 e 440 ms [measured]. Falta o teste de uso com pessoas reais, que tem roteiro pronto (Apêndice C).

## 1.2 Problema e oportunidade

### Problema

A pesquisa do grupo analisou Kiwify, Hotmart e Cakto, usando como base reclamações públicas (Reclame Aqui), comparativos e materiais das próprias plataformas. Não houve entrevistas. As dores que mais se repetiram foram:

| # | Dor | Quem sente | Evidência encontrada |
| --- | --- | --- | --- |
| P1 | Montar um produto bonito e completo exige conhecimento técnico ou freelancer | Produtor | Anúncios de freelancer só para configurar área de membros; o Hotmart Club tem mais de 20 opções de personalização |
| P2 | Dinheiro retido ou conta bloqueada sem explicação | Produtor | Saldo travado e produto bloqueado por 7 vendas de R$ 9,90 (Kiwify); bloqueio sem aviso e pedidos repetidos de prova (Cakto) |
| P3 | Reembolso e suporte sem responsável claro | Aluno | Na Kiwify, estorno é 38,87% das reclamações, com resposta média de 12 dias e 16 horas; a Hotmart se declara só processadora do pagamento; na Cakto o reembolso depende do saldo do produtor |
| P4 | Divisão de receita e imposto pouco claros na coprodução | Coprodutor | Parceiro pessoa física gera problema fiscal (Hotmart); os termos da Cakto exigem saldo das duas partes para reembolsar |

A matriz completa, com as fontes, está no Apêndice D.

### Limites da evidência

- O Reclame Aqui reúne sobretudo quem teve problema, e várias reclamações têm de 1 a 4 anos. A pesquisa mostra onde dói, mas não mede quanto.
- Parte dos números sobre a Cakto vem da Greenn, que é concorrente dela.
- Não encontramos estudos de usabilidade sobre criar produto e montar área de membros. Por isso o teste de uso (Apêndice C) é a principal validação pendente.

### Oportunidade

Fora do Brasil o padrão se repete: o Kajabi é poderoso e demorado de aprender, o Stan Store é simples e limitado, e o Podia fica no meio. Nenhuma das plataformas pesquisadas junta criação guiada com transparência financeira. É esse espaço que o {{PRODUTO}} ocupa.

O público mais provável para começar é quem já paga freelancer para montar o produto ou junta duas ferramentas (uma para vender e outra para a área de membros) **(hipótese)**.

## 1.3 Solução proposta

O MVP tem quatro apostas, uma para cada dor:

| Aposta | O que o sistema faz | Dor |
| --- | --- | --- |
| Criação guiada | O produtor responde um assistente (tipo, nome, preço, público) e escolhe um de 4 modelos: curso online, mentoria, clube de assinatura ou workshop. O sistema gera página de venda, checkout, área de membros, e-mail de acesso e política de reembolso, já com a marca dele (logo, cor, fonte). Uma lista de pendências diz o que falta antes de publicar. | P1 |
| Painel de dinheiro transparente | O saldo aparece separado em retido, liberado e sacado. Cada valor retido mostra o motivo e a data exata em que libera. Um bloqueio do suporte sempre vem com motivo e próximo passo. | P2 |
| Reembolso com responsável | O aluno pede o reembolso na própria área. Dentro dos 7 dias de garantia ele é aprovado na hora. Fora dela, o produtor tem 3 dias para responder; se não responder, o pedido passa para o suporte da plataforma. O aluno sempre vê quem está cuidando e até quando. | P3 |
| Coprodução com contrato | O produtor convida o parceiro com percentual e duração. A divisão só vale depois do aceite do contrato digital, que guarda data, usuário e versão do texto. Cada parte vê a regra aplicada em cada venda. | P4 |

### Perfis atendidos

Uma mesma conta pode ser produtor, aluno e coprodutor ao mesmo tempo, porque o papel depende da relação com cada produto.

| Perfil | Quem é | O que precisa |
| --- | --- | --- |
| Produtor | Iniciante ou de pequeno porte, sem time técnico; vende curso, mentoria ou assinatura | Publicar o primeiro produto rápido e entender o próprio saldo |
| Aluno | Quem compra o produto | Receber o acesso, saber o status de um reembolso e a quem recorrer |
| Coprodutor | Parceiro do produtor com participação nas vendas | Saber quanto recebe e por quê |
| Suporte da plataforma | Equipe interna (no MVP, o próprio grupo) | Mediar reembolsos parados, revisar saques e aplicar bloqueios |

### Fora do escopo do MVP

Afiliados e marketplace, gamificação, meio de pagamento próprio e antecipação de recebíveis, emissão de nota fiscal, app mobile nativo, domínio próprio do produtor e recursos de IA. A hospedagem de vídeo também fica de fora: a aula guarda a URL de um player externo (YouTube não listado, Vimeo ou Bunny).

## 1.4 Modelo de negócio

### Fonte de receita

O {{PRODUTO}} cobra uma taxa por venda e uma taxa por saque, no mesmo formato das plataformas concorrentes. Os valores abaixo estão no sistema e ficam num único arquivo de parâmetros, para serem calibrados depois do teste de uso **(hipótese)**:

| Cobrança | Valor | Quando |
| --- | --- | --- |
| Taxa por venda | 5% do valor bruto + R$ 2,49 | Em toda venda paga, mostrada ao produtor antes de publicar |
| Taxa de saque | R$ 3,50 por saque, mínimo de R$ 50,00 | Na solicitação de saque, mostrada antes de confirmar |
| Reembolso | A plataforma devolve a parte percentual da taxa e fica com os R$ 2,49 fixos | Em todo reembolso aprovado |

Exemplo de uma venda de R$ 100,00 sem coprodutor: taxa de R$ 7,49 e líquido de R$ 92,51 para o produtor. Se houver reembolso, o aluno recebe R$ 100,00 de volta, a plataforma devolve R$ 5,00 e o produtor devolve R$ 95,00.

Comparação com o mercado, segundo a pesquisa:

| Plataforma | Taxa no cartão | Taxa no Pix |
| --- | --- | --- |
| Cakto | 4,99% + R$ 2,49 | 0% + R$ 2,49 |
| Kiwify | 8,99% + R$ 2,49 | Sem valor separado na pesquisa |
| {{PRODUTO}} (MVP) | 5% + R$ 2,49 | 5% + R$ 2,49 |

A taxa fica perto da Cakto e bem abaixo da Kiwify. Cobrar a mesma taxa no Pix e no cartão simplifica a explicação ao produtor, mas deixa o Pix mais caro que na Cakto; o grupo pode revisar isso na calibragem.

### Lean Canvas

| Bloco | Conteúdo |
| --- | --- |
| Problema | Reembolso e suporte sem responsável claro; dinheiro retido e bloqueios sem explicação; montar produto bonito exige técnico ou freelancer. Alternativas de hoje: Kiwify, Hotmart e Cakto para vender, MemberKit ou WordPress com plugin para a área de membros, e freelancer para montar tudo. |
| Segmentos de clientes | Produtores iniciantes e de pequeno porte, sem time técnico. Também alunos e coprodutores, que chegam pelo produtor. Primeiros clientes: quem paga freelancer ou usa duas ferramentas **(hipótese)**. |
| Proposta de valor | Qualquer pessoa monta sozinha um produto digital completo e bonito, e vê para onde vai cada real e cada reembolso. |
| Solução | Criação guiada com modelos e marca aplicada; painel que explica cada valor retido; reembolso e suporte na área do aluno com responsável; coprodução com contrato digital e extrato por parte. |
| Canais | Comunidades e criadores de conteúdo sobre infoprodutos, indicação entre produtores e vídeos mostrando a criação de um produto do zero **(hipótese)**. |
| Fontes de receita | Taxa por venda (5% + R$ 2,49) e taxa de saque (R$ 3,50) **(hipótese)**. |
| Estrutura de custos | Horas de desenvolvimento do grupo, hospedagem da aplicação e do banco, envio de e-mail transacional, suporte e taxas do provedor de pagamento (Asaas). Valores a estimar. |
| Métricas-chave | Tempo até publicar o primeiro produto; percentual de produtos criados que chegam a ser publicados; tempo até a primeira resposta a um reembolso; contatos de suporte por produtor. O sistema já calcula as quatro no painel do suporte. |
| Vantagem competitiva | Ainda não há uma vantagem difícil de copiar. A aposta é a combinação de criação guiada com transparência financeira, que não encontramos junta nas plataformas pesquisadas. |

### Custos e riscos do modelo

- O provedor de pagamento (Asaas) cobra por transação; essa taxa sai da taxa da plataforma e reduz a margem. Os valores do Asaas ainda não entraram na conta.
- A retenção de 7 dias protege a plataforma de reembolsos dentro da garantia. Fora dela, se o saldo do produtor não cobrir o estorno, o saldo fica negativo e o saque é bloqueado até ser coberto.
- A garantia de 7 dias segue o direito de arrependimento do Código de Defesa do Consumidor para compras online.

## 1.5 Análise de concorrentes e público-alvo

### Concorrentes

| Plataforma | O que oferece | Ponto fraco encontrado na pesquisa |
| --- | --- | --- |
| Hotmart | A maior do Brasil; checkout, área de membros (Hotmart Club) e afiliados | Muitas opções de personalização, o que exige tempo ou ajuda técnica; diz ser só processadora no reembolso |
| Kiwify | Checkout e área de membros com foco em simplicidade | Estorno é o principal motivo de reclamação; saldo travado e bloqueios sem explicação; não deixa baixar os próprios vídeos |
| Cakto | Taxas baixas, sobretudo no Pix | Bloqueio de conta sem aviso; reembolso depende do saldo do produtor; atendimento descrito como robotizado |
| MemberKit | Só área de membros, ligada a outra plataforma de venda | O produtor precisa juntar duas ferramentas |
| Kajabi, Podia, Stan Store (exterior) | Do mais completo (Kajabi) ao mais simples (Stan Store) | Quem é poderoso é difícil de aprender; quem é simples é limitado |

### Comparativo de recursos

| Recurso | Hotmart | Kiwify | Cakto | {{PRODUTO}} |
| --- | --- | --- | --- | --- |
| Criação guiada por modelo, com marca aplicada | Não verificado | Não verificado | Não verificado | Sim |
| Motivo e data de liberação em cada valor retido | Não encontrado | Não encontrado | Não encontrado | Sim |
| Reembolso com responsável e prazo visíveis ao aluno | Não encontrado | Não encontrado | Não encontrado | Sim |
| Contrato de coprodução com aceite versionado | Parcial | Não verificado | Parcial | Sim |
| Afiliados e marketplace | Sim | Sim | Sim | Não (fora do MVP) |
| Hospedagem de vídeo | Sim | Sim | Sim | Não (player externo) |

"Não verificado" e "Não encontrado" querem dizer que a pesquisa não encontrou registro; isso não prova que o recurso não exista. O teste de uso nas três plataformas, previsto na pesquisa, troca essas células por dado próprio.

### Público-alvo

**Primário: o produtor iniciante ou pequeno.** Pessoa que sabe ensinar algo (aula particular, artesanato, receita, uma habilidade profissional) e quer vender um curso curto, uma mentoria ou uma assinatura. Não tem time técnico e não quer pagar freelancer. Usa o celular para quase tudo. Precisa publicar rápido, cobrar por Pix e entender quando o dinheiro cai.

**Secundário: o aluno.** Compra pelo celular, quase sempre por Pix. Quer receber o acesso na hora e, se algo der errado, saber com quem falar e até quando terá resposta.

**Secundário: o coprodutor.** Parceiro que entra com audiência ou conteúdo em troca de um percentual. Quer conferir a própria parte de cada venda sem depender do produtor.
