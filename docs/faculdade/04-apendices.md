# Apêndices

> **Summary.** Material produzido pelo grupo que apoia os capítulos: as telas do
> sistema (A), as regras de negócio (B), o plano de testes e o roteiro do teste de
> uso (C) e a pesquisa de dores com as fontes (D). As telas são capturas
> automáticas do build de produção, tiradas pelo `pnpm test:review`.

## Apêndice A: Telas do sistema

Capturas do build de produção, com dados de demonstração, em desktop. As que estão marcadas com (celular) foram tiradas em 375 px. Todas as telas também têm tema escuro.

### A.1 Público

![Página de venda](img/telas/desktop/public-sales-page.png)
*Figura A.1: Página de venda gerada a partir do modelo, na marca do produtor.*

![Checkout](img/telas/desktop/public-checkout.png)
*Figura A.2: Checkout com Pix e cartão e a política de reembolso visível antes de pagar.*

![Status do pedido](img/telas/desktop/public-order.png)
*Figura A.3: Status do pedido depois do checkout.*

![Login](img/telas/desktop/public-login.png)
*Figura A.4: Login.*

![Cadastro](img/telas/desktop/public-register.png)
*Figura A.5: Cadastro.*

### A.2 Produtor

![Meus produtos](img/telas/desktop/producer-products.png)
*Figura A.6: Lista de produtos do produtor.*

![Assistente de criação](img/telas/desktop/producer-new.png)
*Figura A.7: Assistente de criação, uma pergunta por passo.*

![Estúdio do produto](img/telas/desktop/producer-editor.png)
*Figura A.8: Estúdio do produto, com a lista de pendências antes de publicar.*

![Edição de página](img/telas/desktop/producer-page.png)
*Figura A.9: Edição das seções da página de venda.*

![Módulos e aulas](img/telas/desktop/producer-content.png)
*Figura A.10: Módulos e aulas.*

![Ofertas](img/telas/desktop/producer-offers.png)
*Figura A.11: Ofertas únicas e mensais.*

![Prévia](img/telas/desktop/producer-preview.png)
*Figura A.12: Prévia do produto como o aluno veria.*

![Coprodução](img/telas/desktop/producer-coproduction.png)
*Figura A.13: Convite de coprodução com o simulador da divisão.*

![Painel de dinheiro](img/telas/desktop/producer-money.png)
*Figura A.14: Painel de dinheiro: retido, liberado e sacado, com o motivo e a data de cada retenção.*

![Extrato](img/telas/desktop/producer-statement.png)
*Figura A.15: Extrato com filtros e exportação em CSV.*

![Saques](img/telas/desktop/producer-payouts.png)
*Figura A.16: Saques, com a taxa mostrada antes de confirmar.*

![Reembolsos recebidos](img/telas/desktop/producer-refunds.png)
*Figura A.17: Reembolsos recebidos pelo produtor.*

![Resposta a reembolso](img/telas/desktop/producer-refund.png)
*Figura A.18: Resposta a um pedido de reembolso fora da garantia, com o prazo.*

![Conta](img/telas/desktop/producer-account.png)
*Figura A.19: Conta: nome, tema e encerramento da conta (LGPD).*

### A.3 Aluno

![Meus produtos do aluno](img/telas/desktop/student-home.png)
*Figura A.20: Produtos comprados pelo aluno.*

![Player](img/telas/desktop/student-course.png)
*Figura A.21: Player das aulas com o progresso.*

![Meus pedidos](img/telas/desktop/student-orders.png)
*Figura A.22: Pedidos do aluno com o status do pagamento e do acesso.*

![Pedir reembolso](img/telas/desktop/student-refund-new.png)
*Figura A.23: Pedido de reembolso com motivo.*

![Status do reembolso](img/telas/desktop/student-refund.png)
*Figura A.24: Status do reembolso: etapa, responsável atual, prazo e conversa.*

![Chamados](img/telas/desktop/student-tickets.png)
*Figura A.25: Chamados do aluno.*

![Chamado](img/telas/desktop/student-ticket.png)
*Figura A.26: Conversa de um chamado.*

### A.4 Coprodutor

![Convites](img/telas/desktop/coproducer-list.png)
*Figura A.27: Coproduções do usuário.*

![Contrato](img/telas/desktop/coproducer-contract.png)
*Figura A.28: Contrato de coprodução versionado, com o aceite.*

### A.5 Suporte

![Fila](img/telas/desktop/support-queue.png)
*Figura A.29: Fila de reembolsos escalados e chamados abertos, ordenada por prazo.*

![Decisão de reembolso](img/telas/desktop/support-refund.png)
*Figura A.30: Decisão do suporte sobre um reembolso escalado.*

![Chamado no suporte](img/telas/desktop/support-ticket.png)
*Figura A.31: Resposta do suporte a um chamado.*

![Saques pendentes](img/telas/desktop/support-payouts.png)
*Figura A.32: Saques aguardando revisão.*

![Bloqueios](img/telas/desktop/support-blocks.png)
*Figura A.33: Bloqueios, sempre com motivo e próximo passo.*

![Auditoria](img/telas/desktop/support-audit.png)
*Figura A.34: Registro de auditoria das ações do suporte.*

![Métricas](img/telas/desktop/support-metrics.png)
*Figura A.35: Métricas do Lean Canvas: tempo até publicar, primeira resposta em reembolso, volume e receita de taxas.*

### A.6 Celular

![Página de venda no celular](img/telas/mobile/public-sales-page.png)
*Figura A.36: Página de venda (celular).*

![Checkout no celular](img/telas/mobile/public-checkout.png)
*Figura A.37: Checkout (celular).*

![Player no celular](img/telas/mobile/student-course.png)
*Figura A.38: Player (celular).*

![Reembolso no celular](img/telas/mobile/student-refund.png)
*Figura A.39: Status do reembolso (celular).*

![Painel de dinheiro no celular](img/telas/mobile/producer-money.png)
*Figura A.40: Painel de dinheiro (celular).*

## Apêndice B: Regras de negócio

Valores marcados como (hipótese) são parâmetros do MVP, guardados em um só arquivo do código (`src/lib/domain/params.ts`), e podem mudar depois do teste com usuários.

| ID | Regra |
| --- | --- |
| RN-01 | Produto só pode ser publicado sem pendências: ao menos uma oferta, uma aula, política de reembolso e página de venda preenchida. |
| RN-02 | Taxa da plataforma: 5% do valor bruto + R$ 2,49 por venda (hipótese), mostrada ao produtor antes de publicar. |
| RN-03 | Garantia de 7 dias corridos a partir da confirmação do pagamento, em todo produto, refletindo o direito de arrependimento do CDC para compra online. Pedido dentro da garantia é aprovado automaticamente. |
| RN-04 | Todo valor pago fica retido até o fim da garantia e depois passa a liberado. O motivo e a data aparecem no painel. |
| RN-05 | Divisão da venda: valor bruto menos taxa da plataforma é o líquido. Do líquido, o coprodutor recebe seu percentual (arredondado para baixo, em centavos) e o produtor recebe o restante. A soma das partes é sempre igual ao líquido. |
| RN-06 | Reembolso aprovado devolve o valor bruto ao aluno, revoga a matrícula e cria estornos para produtor e coprodutor, na proporção da venda. A taxa fixa não é devolvida pela plataforma (hipótese): a plataforma devolve a parte percentual da taxa, e produtor e coprodutor devolvem o líquido mais a taxa fixa. |
| RN-07 | Se o valor a estornar já foi liberado ou sacado e o saldo não cobre, o saldo do produtor fica negativo e o saque fica bloqueado, com explicação no painel. |
| RN-08 | Fora da garantia, o produtor tem 3 dias corridos para aprovar ou recusar (hipótese). Sem resposta, o pedido escala para o suporte, que tem mais 3 dias. Recusa exige justificativa visível ao aluno. |
| RN-09 | O aluno pode contestar uma recusa uma única vez. A contestação vai direto ao suporte. |
| RN-10 | Todo pedido de reembolso tem sempre um responsável atual (produtor ou plataforma) e um prazo. |
| RN-11 | Bloqueio de saldo ou produto pelo suporte exige motivo e um próximo passo (por exemplo, enviar documento). Sem isso o sistema não grava o bloqueio. |
| RN-12 | Coprodução só tem efeito após o aceite. Mudar o percentual exige novo aceite e vale só para vendas posteriores. A soma dos coprodutores de um produto não passa de 90% do líquido (hipótese). |
| RN-13 | Saque: mínimo de R$ 50 e taxa fixa de R$ 3,50, mostrados antes da confirmação (hipótese). A taxa sai do valor sacado, e só se saca saldo liberado. |
| RN-14 | Lançamentos são imutáveis. Correção é um novo lançamento que referencia o original. |
| RN-15 | Pagamento confirmado duas vezes (webhook repetido) gera um único pedido pago, identificado pelo id externo do provedor. |
| RN-16 | O acesso do aluno vale enquanto o pedido estiver pago e não reembolsado. Em assinatura, enquanto a recorrência estiver em dia. |

### B.1 Exemplo de cálculo

Venda de R$ 100,00 sem coprodução:

| Item | Valor |
| --- | --- |
| Valor bruto | R$ 100,00 |
| Taxa da plataforma (5% + R$ 2,49) | R$ 7,49 |
| Líquido do produtor, retido por 7 dias | R$ 92,51 |
| Se reembolsado: a plataforma devolve | R$ 5,00 |
| Se reembolsado: o produtor devolve | R$ 95,00 |

A mesma venda com um coprodutor de 30%: o coprodutor recebe R$ 27,75 (30% de R$ 92,51, arredondado para baixo) e o produtor R$ 64,76.

## Apêndice C: Testes

### C.1 Plano de testes automatizados

| Nível | O que cobre | Ferramenta |
| --- | --- | --- |
| Unitário | Divisão e arredondamento (RN-05), simulação ao vivo, datas de liberação (RN-04), transições de estado, adaptadores Asaas e Resend | Vitest, com testes de propriedade |
| Integração | Transação de pagamento, assinaturas, webhook repetido (RN-15), estorno com saldo insuficiente (RN-07), encerramento de conta, métricas e links dos e-mails | Vitest com PostgreSQL de teste |
| Ponta a ponta | Jornadas completas entre perfis, UC-01 a UC-09, navegação por perfil, conta e tema, exportação CSV | Playwright, desktop e 375 px |
| Acessibilidade e desempenho | Nenhuma violação do axe em todas as rotas nos dois temas; LCP público abaixo de 2,5 s; capturas finais | Playwright com axe |
| Segurança | Todas as rotas e formulários da área logada testados contra outros perfis, outros donos e visitantes anônimos | Playwright e banco |
| Usabilidade | Tempo e pontos de confusão para criar o primeiro produto, com 3 a 5 pessoas não técnicas | Teste moderado, roteiro fixo (C.2) |

Resultado da última rodada completa [measured]: 276 testes unitários, 129 de integração e 289 de ponta a ponta passando; LCP público entre 376 e 440 ms.

### C.2 Roteiro do teste de uso

**Quem.** 3 a 5 pessoas que nunca venderam produto digital e não trabalham com tecnologia, por exemplo quem dá aula particular, faz artesanato ou tem uma receita a ensinar. Ninguém do grupo e ninguém que já viu o sistema.

**Preparo.** Build de produção rodando localmente, uma conta nova por pessoa, criada por ela mesma. Tela gravada com consentimento e uma pessoa do grupo anotando. Quem conduz não ajuda: se perguntarem, devolve "o que você faria?". Metade das sessões no celular, metade no computador.

**Tarefa lida para a pessoa.**

> "Você vai vender um curso curto sobre algo que sabe fazer. Crie a sua conta, monte o produto com o nome, o preço e a cor que quiser, coloque pelo menos uma aula e deixe o produto publicado, pronto para vender. Pense em voz alta enquanto faz."

Ao terminar: "Agora me mostre como o aluno vai ver o seu produto."

**O que medir.**

| Medida | Como | Meta |
| --- | --- | --- |
| Concluiu sem ajuda | Produto publicado sem intervenção | 4 de 5 |
| Tempo até publicar | Do cadastro ao produto publicado | Menos de 15 min |
| Travas | Momentos parados por mais de 30 s ou com pergunta ao condutor | Anotar cada uma, com a tela |
| Erros | Mensagem de erro vista e se a pessoa entendeu o que fazer | Anotar o texto |
| Nota | "De 0 a 10, quão fácil foi?" | Média 8 ou mais |

### C.3 Resultados do teste de uso

{{RESULTADOS_TESTE_DE_USO}}

| Data | Pessoa (perfil) | Aparelho | Publicou? | Tempo | Nota | Travas |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

| Trava | Tela | Gravidade | Ajuste |
| --- | --- | --- | --- |
| | | | |

## Apêndice D: Pesquisa de dores

Pesquisa feita pelo grupo em 9/11/2026 sobre Kiwify, Hotmart e Cakto, com MemberKit, Podia, Kajabi e Stan Store como referência. Não houve entrevistas: a base são reclamações públicas, comparativos e materiais das próprias plataformas.

### D.1 Matriz de dores

| Perfil | Dor | Kiwify | Hotmart | Cakto |
| --- | --- | --- | --- | --- |
| Aluno | Reembolso sem responsável claro | Relatada: estorno é 38,87% das reclamações e a resposta leva em média 12 dias e 16 horas | Relatada: a plataforma diz ser só quem processa o pagamento | Relatada: o reembolso depende do saldo do produtor |
| Aluno | Conteúdo bloqueado ou que não chega | Relatada: curso com cadeado e contagem regressiva de 8 dias | Não verificada | Relatada: compra sem acesso e sem resposta do produtor |
| Produtor | Dinheiro retido ou conta bloqueada sem motivo claro | Relatada: saldo travado e produto bloqueado por 7 vendas de R$ 9,90 | Relatada: conta bloqueada com saldo retido, segundo a Greenn (concorrente) | Relatada: bloqueio sem aviso e pedidos repetidos de prova |
| Produtor e aluno | Suporte lento ou genérico | Relatada: respostas em horas ou dias, sem prazo | Não verificada | Relatada por compradores: atendimento robotizado |
| Produtor | Preso à plataforma | Relatada: não dá para baixar os próprios vídeos hospedados no Vimeo | Não verificada | Não verificada |
| Produtor | Montar um produto bonito e completo sem ajuda técnica | Não verificada | Parcial: o Hotmart Club tem mais de 20 opções de personalização, segundo a própria Hotmart | Não verificada |
| Produtor | Taxa e reserva pouco transparentes | Relatada: taxa de saque de R$ 3,67 por solicitação gerou queixa | Não verificada | Relatada: reserva de 10% no Pix e 20% no cartão por 35 dias, segundo a Greenn, a confirmar |
| Coprodutor | Divisão de receita e imposto pouco claros | Não verificada | Parcial: a DIMP passou a refletir a divisão acordada, mas parceiro pessoa física gera problema fiscal | Parcial: os termos exigem saldo de produtor e coprodutor para reembolsar |

"Relatada" quer dizer que a dor apareceu em ao menos uma fonte pública. "Não verificada" não prova que a dor não existe, só que não achamos registro.

### D.2 Limites da evidência

- O Reclame Aqui reúne sobretudo quem teve problema, e várias reclamações têm de 1 a 4 anos. As plataformas podem ter mudado desde então.
- A Greenn é concorrente, e os números de volume e reputação da Cakto vêm da própria Cakto.
- A reserva de 10% e 20% por 35 dias na Cakto aparece só na página da Greenn e precisa ser confirmada.
- Os dados vieram de resultados de busca, sem leitura completa de cada página.
- Não achamos avaliações de usabilidade sobre criar produto e montar área de membros. Por isso o teste de uso (Apêndice C) mede esse ponto.

### D.3 Fontes

- [Reclame Aqui: Kiwify](https://www.reclameaqui.com.br/empresa/kiwify/)
- [Kiwify ou Hotmart: comparativo de taxas em 2026 (Greenn)](https://greenn.com.br/comparativos/kiwify-vs-hotmart/)
- [A Cakto é confiável? (Greenn)](https://greenn.com.br/e-confiavel/cakto/)
- [Kiwify e Hotmart podem bloquear seu dinheiro?](https://guariniliberato.com/2026/10/02/kiwify-hotmart-bloquear-dinheiro-vendas/)
- [Reclame Aqui: produto bloqueado por 7 vendas](https://www.reclameaqui.com.br/kiwify/kiwify-o-pior-absurdo-que-ja-vi-na-minha-vida_NIGbaf1D-YbgOJuA/)
- [Reclame Aqui: falta de suporte ao produtor na Kiwify](https://www.reclameaqui.com.br/kiwify/falta-de-suporte-com-o-produtor_tohzdTzWi2q4rnfp/)
- [Reclame Aqui: problemas com experiência dos alunos](https://www.reclameaqui.com.br/kiwify/problemas-com-experiencia-dos-alunos_tAVJ05uNo9AmTFZ5/)
- [Reclame Aqui: conteúdo bloqueado e reembolso](https://www.reclameaqui.com.br/hotmart/curso-de-doces-com-conteudo-bloqueado-e-solicitacao-de-reembolso-pendente-n_Yyvsq8ZtwTTFwtOm/)
- [Reclame Aqui: conta bloqueada na Cakto](https://www.reclameaqui.com.br/cakto-pay/conta-bloqueada-e-falta-de-suporte-ao-produtor-na-cakto_eeicYhWWeOgOOQvs/)
- [Reclame Aqui: reembolso e saldo do produtor na Cakto](https://www.reclameaqui.com.br/cakto-pay/cakto-nao-e-seria-engana-e-abandona-o-consumidor_7IIIzts8R0p4VyXN/)
- [Pontos fracos da Cakto (blog da Cakto)](https://www.cakto.com.br/blog/pontos-fracos-da-cakto)
- [Hotmart Club](https://hotmart.com/pt-br/members-area)
- [MemberKit: para que serve](https://bit4learn.com/pt/?p=1902)
- [Hotmart entrega a DIMP dos infoprodutores](https://tactus.com.br/hotmart-entrega-a-dimp-dos-infoprodutores/amp/)
- [Será o fim da coprodução em infoprodutos?](https://www.rotajuridica.com.br/?p=148608)
- [Anúncio de freelancer para área de membros](https://www.workana.com/job/criacao-e-configuracao-de-area-de-membros-profissional-para-infoproduto-1)
- [Podia alternatives 2026](https://talkspresso.com/blog/podia-alternatives-creators-2026)
- [Kajabi vs Stan Store](https://schoolmaker.com/blog/kajabi-vs-stan-store)
