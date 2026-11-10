# Requisitos

Prioridade segue MoSCoW: **M** (deve), **S** (deveria), **C** (poderia). No MVP entram todos os M e, se der tempo, os S.

## 1. Requisitos funcionais

### Conta e acesso

| ID | Requisito | Perfil | Prio |
| --- | --- | --- | --- |
| RF-01 | Cadastro e login por e-mail e senha | Todos | M |
| RF-02 | Recuperação de senha por e-mail | Todos | S |
| RF-03 | Aluno é criado automaticamente na primeira compra, com link para definir senha | Aluno | M |
| RF-04 | Uma mesma conta pode ser produtor, aluno e coprodutor | Todos | M |

### Criação guiada (P1)

| ID | Requisito | Perfil | Prio |
| --- | --- | --- | --- |
| RF-10 | Assistente de criação: o produtor responde perguntas (tipo, nome, preço, público) e escolhe um modelo | Produtor | M |
| RF-11 | O sistema gera rascunho de página de venda, checkout, área de membros, e-mails e política de reembolso a partir do modelo | Produtor | M |
| RF-12 | Marca aplicada automaticamente (logo, cor principal, fonte) em todas as páginas geradas | Produtor | M |
| RF-13 | Editor simples para ajustar textos, imagens e ordem das seções antes de publicar | Produtor | M |
| RF-14 | Cadastro de módulos e aulas (título, URL do vídeo, texto, material anexo) | Produtor | M |
| RF-15 | Lista de pendências antes de publicar (ex.: falta aula, falta política) e botão Publicar | Produtor | M |
| RF-16 | Pré-visualização como o aluno veria | Produtor | S |

### Venda e entrega

| ID | Requisito | Perfil | Prio |
| --- | --- | --- | --- |
| RF-20 | Página de venda pública por produto publicado | Aluno | M |
| RF-21 | Checkout com Pix e cartão via adaptador de pagamento | Aluno | M |
| RF-22 | Confirmação de pagamento (webhook ou retorno) cria a matrícula e envia e-mail de acesso | Aluno | M |
| RF-23 | Área de membros: lista de módulos e aulas, marcar aula como concluída, progresso | Aluno | M |
| RF-24 | Aluno vê seus pedidos, status do pagamento e do acesso | Aluno | M |

### Reembolso e suporte (P3)

| ID | Requisito | Perfil | Prio |
| --- | --- | --- | --- |
| RF-30 | Aluno pede reembolso dentro da área dele, com motivo | Aluno | M |
| RF-31 | Todo pedido tem status visível, responsável atual e prazo de resposta | Aluno | M |
| RF-32 | Pedido dentro da garantia é aprovado automaticamente (RN-03) | Aluno | M |
| RF-33 | Fora da garantia, o produtor aprova ou recusa com justificativa dentro do prazo | Produtor | M |
| RF-34 | Sem resposta no prazo, o pedido escala para o suporte da plataforma, que decide | Suporte | M |
| RF-35 | Aluno abre chamado de suporte ligado a um pedido, com histórico de mensagens | Aluno | S |
| RF-36 | Aprovar reembolso revoga a matrícula e estorna os lançamentos (RN-06) | Sistema | M |

### Painel de dinheiro (P2)

| ID | Requisito | Perfil | Prio |
| --- | --- | --- | --- |
| RF-40 | Cada venda gera lançamentos no extrato do produtor (e do coprodutor, se houver) | Produtor | M |
| RF-41 | Saldo dividido em retido, liberado e sacado | Produtor | M |
| RF-42 | Cada valor retido mostra motivo e data de liberação | Produtor | M |
| RF-43 | Extrato filtrável por produto, período e status | Produtor | S |
| RF-44 | Solicitação de saque (simulada) com taxa mostrada antes de confirmar | Produtor | M |
| RF-45 | Se o suporte bloquear saldo ou conta, o painel mostra o motivo e o caminho para resolver | Produtor | M |

### Coprodução (P4)

| ID | Requisito | Perfil | Prio |
| --- | --- | --- | --- |
| RF-50 | Produtor convida coprodutor por e-mail, definindo percentual e duração | Produtor | M |
| RF-51 | Contrato digital gerado com as condições e aceite registrado (data, usuário, versão do texto) | Coprodutor | M |
| RF-52 | Divisão só vale após o aceite; mudança de percentual exige novo aceite e vale só para vendas futuras | Sistema | M |
| RF-53 | Coprodutor vê o extrato da própria parte, com a regra aplicada em cada venda | Coprodutor | M |

### Administração (suporte)

| ID | Requisito | Perfil | Prio |
| --- | --- | --- | --- |
| RF-60 | Fila de reembolsos escalados e chamados abertos | Suporte | M |
| RF-61 | Bloquear/desbloquear saldo ou produto, sempre com motivo obrigatório visível ao produtor | Suporte | M |
| RF-62 | Registro de auditoria de toda ação do suporte | Suporte | M |

## 2. Requisitos não funcionais

| ID | Requisito | Meta |
| --- | --- | --- |
| RNF-01 | Valores monetários em centavos inteiros, nunca ponto flutuante | Sempre |
| RNF-02 | Lançamentos financeiros imutáveis (só se corrige com novo lançamento) | Sempre |
| RNF-03 | Operações de pagamento e reembolso transacionais e idempotentes (webhook repetido não duplica) | Sempre |
| RNF-04 | Senhas com hash forte (argon2 ou bcrypt); sessão em cookie HttpOnly | Sempre |
| RNF-05 | Autorização por perfil e por dono do recurso verificada no servidor | Sempre |
| RNF-06 | Conformidade com a LGPD: coletar o mínimo, permitir exclusão da conta | Antes de dados reais |
| RNF-07 | Páginas públicas carregam em até 2,5 s (LCP) em 4G | **(hipótese)** |
| RNF-08 | Layout responsivo; checkout pensado primeiro para celular | Sempre |
| RNF-09 | Tipagem estrita (TypeScript strict) e validação de entrada em toda fronteira | Sempre |
| RNF-10 | Regras de negócio puras (cálculo de split, retenção, prazos) com testes unitários | Sempre |
| RNF-11 | Fuso horário: guardar em UTC, exibir em America/Sao_Paulo | Sempre |

## 3. Casos de uso principais

| ID | Caso de uso | Ator | Requisitos |
| --- | --- | --- | --- |
| UC-01 | Criar e publicar produto | Produtor | RF-10 a RF-15 |
| UC-02 | Comprar produto | Aluno | RF-20 a RF-22 |
| UC-03 | Assistir às aulas | Aluno | RF-23 |
| UC-04 | Pedir reembolso | Aluno | RF-30 a RF-32 |
| UC-05 | Responder reembolso | Produtor | RF-33 |
| UC-06 | Mediar reembolso escalado | Suporte | RF-34, RF-60 |
| UC-07 | Consultar saldo e sacar | Produtor | RF-40 a RF-44 |
| UC-08 | Convidar e aceitar coprodução | Produtor, Coprodutor | RF-50 a RF-52 |
| UC-09 | Consultar extrato da coprodução | Coprodutor | RF-53 |

## 4. Histórias de usuário com critérios de aceite

**US-01 (UC-01).** Como produtor iniciante, quero responder poucas perguntas e receber um produto montado, para publicar sem pagar freelancer.
- Dado que respondi o assistente e escolhi um modelo, quando confirmo, então existem página de venda, checkout, área de membros, e-mails e política de reembolso em rascunho.
- A logo e a cor que informei aparecem em todas as páginas.
- O botão Publicar só habilita sem pendências, e as pendências são listadas.

**US-02 (UC-04).** Como aluno, quero pedir reembolso e saber quem está cuidando, para não ficar sem resposta.
- Ao pedir, vejo status, nome do responsável (produtor ou plataforma) e a data limite.
- Dentro de 7 dias da compra o reembolso é aprovado sozinho e o status muda na hora.
- Se o produtor não responde no prazo, o responsável muda para a plataforma e eu vejo a mudança.

**US-03 (UC-07).** Como produtor, quero ver por que um valor está retido, para saber quando vou receber.
- Cada valor retido mostra o motivo (ex.: período de garantia) e a data exata de liberação.
- A soma de retido, liberado e sacado bate com a soma dos lançamentos.

**US-04 (UC-08).** Como coprodutor, quero ver quanto recebo de cada venda, para conferir a divisão.
- O extrato mostra valor bruto, taxa da plataforma, parte do produtor e a minha parte, com o percentual do contrato aplicado.
- Venda anterior ao aceite não gera lançamento para mim.
