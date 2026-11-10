# Modelo de dados

Banco relacional (PostgreSQL proposto). Valores em centavos inteiros (RNF-01). Datas em UTC (RNF-11). Este documento usa os nomes em português do glossário. No código, no banco e na API tudo é em inglês: a tabela de correspondência está em `convencoes.md`.

## 1. Diagrama entidade-relacionamento

```mermaid
erDiagram
    USUARIO ||--o{ PRODUTO : "é dono de"
    USUARIO ||--o{ PEDIDO : "compra"
    USUARIO ||--o{ COPRODUCAO : "é coprodutor em"
    USUARIO ||--o{ LANCAMENTO : "tem saldo em"
    USUARIO ||--o{ SAQUE : "solicita"

    MODELO ||--o{ PRODUTO : "origina"
    PRODUTO ||--o{ MODULO : "contém"
    MODULO ||--o{ AULA : "contém"
    PRODUTO ||--o{ OFERTA : "vende por"
    PRODUTO ||--o{ COPRODUCAO : "divide receita"
    PRODUTO ||--o{ PAGINA : "tem"

    OFERTA ||--o{ PEDIDO : "origina"
    PEDIDO ||--o| MATRICULA : "libera"
    MATRICULA ||--o{ PROGRESSO_AULA : "registra"
    AULA ||--o{ PROGRESSO_AULA : "é concluída em"

    PEDIDO ||--o{ LANCAMENTO : "gera"
    PEDIDO ||--o{ REEMBOLSO : "pode ter"
    REEMBOLSO ||--o{ MENSAGEM : "tem conversa"
    COPRODUCAO ||--o{ ACEITE : "registra"

    USUARIO ||--o{ BLOQUEIO : "sofre"
    USUARIO ||--o{ AUDITORIA : "executa"

    USUARIO {
        uuid id PK
        text email UK
        text nome
        text senha_hash
        text papel_plataforma "usuario ou suporte"
        timestamptz criado_em
    }
    PRODUTO {
        uuid id PK
        uuid produtor_id FK
        uuid modelo_id FK
        text nome
        text tipo "curso, mentoria, assinatura"
        text status "rascunho, publicado, bloqueado"
        jsonb marca "logo, cor, fonte"
        text politica_reembolso
        timestamptz publicado_em
    }
    MODELO {
        uuid id PK
        text nome
        jsonb estrutura "paginas e e-mails padrao"
    }
    PAGINA {
        uuid id PK
        uuid produto_id FK
        text tipo "venda, checkout, email_acesso"
        jsonb conteudo
    }
    MODULO {
        uuid id PK
        uuid produto_id FK
        text titulo
        int ordem
    }
    AULA {
        uuid id PK
        uuid modulo_id FK
        text titulo
        text video_url
        text texto
        int ordem
    }
    OFERTA {
        uuid id PK
        uuid produto_id FK
        text nome
        int preco_centavos
        int garantia_dias "7"
        text recorrencia "unica ou mensal"
    }
    PEDIDO {
        uuid id PK
        uuid oferta_id FK
        uuid aluno_id FK
        int valor_bruto_centavos
        int taxa_centavos
        text status "aguardando, pago, expirado, recusado, reembolsado"
        text id_externo UK "id no provedor"
        timestamptz pago_em
    }
    MATRICULA {
        uuid id PK
        uuid pedido_id FK UK
        uuid aluno_id FK
        uuid produto_id FK
        text status "ativa, revogada"
    }
    PROGRESSO_AULA {
        uuid matricula_id PK
        uuid aula_id PK
        timestamptz concluida_em
    }
    COPRODUCAO {
        uuid id PK
        uuid produto_id FK
        uuid coprodutor_id FK
        int percentual_bp "basis points, 2500 = 25%"
        text status "convidado, ativa, encerrada"
        timestamptz vigente_desde
    }
    ACEITE {
        uuid id PK
        uuid coproducao_id FK
        int versao_contrato
        text texto_hash
        timestamptz aceito_em
    }
    LANCAMENTO {
        uuid id PK
        uuid usuario_id FK
        uuid pedido_id FK
        uuid referencia_id FK "lancamento corrigido"
        text tipo "venda, estorno, saque, taxa_saque, ajuste"
        int valor_centavos "com sinal"
        text estado "retido, liberado, sacado, estornado"
        text motivo
        timestamptz libera_em
        timestamptz criado_em
    }
    SAQUE {
        uuid id PK
        uuid usuario_id FK
        int valor_centavos
        int taxa_centavos
        text status "solicitado, concluido, recusado"
    }
    REEMBOLSO {
        uuid id PK
        uuid pedido_id FK
        text motivo_aluno
        text status "aberto, com_produtor, com_plataforma, aprovado, recusado, concluido"
        text responsavel "produtor ou plataforma"
        timestamptz prazo_em
        bool contestado
        text justificativa_recusa
        timestamptz aberto_em
        timestamptz primeira_resposta_em
    }
    MENSAGEM {
        uuid id PK
        uuid reembolso_id FK
        uuid autor_id FK
        text texto
        timestamptz criada_em
    }
    BLOQUEIO {
        uuid id PK
        uuid usuario_id FK
        uuid produto_id FK
        text alvo "saldo, produto, conta"
        text motivo
        text proximo_passo
        timestamptz ate
    }
    AUDITORIA {
        uuid id PK
        uuid ator_id FK
        text acao
        jsonb detalhe
        timestamptz criada_em
    }
```

## 2. Restrições de integridade (no banco)

| Regra | Como garantir |
| --- | --- |
| Pedido pago só uma vez por cobrança (RN-15) | `UNIQUE (id_externo)` em `PEDIDO` |
| Uma matrícula por pedido | `UNIQUE (pedido_id)` em `MATRICULA` |
| Lançamentos imutáveis (RN-14) | Sem `UPDATE` de valor; permissão de escrita só por `INSERT`. Mudança de `estado` ocorre por job ou transição controlada |
| Soma das partes de uma venda igual ao líquido (RN-05) | Gravar as partes na mesma transação e checar a soma em teste |
| Percentuais de coprodução dentro do limite (RN-12) | Validação na transação de ativar coprodução |
| Bloqueio sempre com motivo (RN-11) | `NOT NULL` em `motivo` e `proximo_passo` |
| Reembolso sempre com responsável e prazo (RN-10) | `NOT NULL` em `responsavel` e `prazo_em` |
| Valor positivo e preço mínimo | `CHECK (preco_centavos >= 500)` **(hipótese)** |

## 3. Saldo

O saldo nunca é uma coluna. É calculado a partir dos lançamentos:

```
retido   = soma(valor) onde estado = 'retido'
liberado = soma(valor) onde estado = 'liberado'
sacado   = soma(valor) onde estado = 'sacado'
```

Assim o painel sempre bate com o extrato (critério da US-03).

## 4. Índices iniciais

- `LANCAMENTO (usuario_id, estado, libera_em)`: painel e job de liberação.
- `PEDIDO (aluno_id)` e `PEDIDO (oferta_id)`.
- `REEMBOLSO (status, prazo_em)`: fila do suporte e job de escalonamento.
- `MATRICULA (aluno_id, status)`: lista de produtos do aluno.
