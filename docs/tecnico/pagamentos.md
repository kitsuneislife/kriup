# Pagamentos

O sistema fala com o provedor de pagamento só pela interface `PaymentGateway` (`src/lib/server/payment/gateway.ts`). Os dois adaptadores já estão implementados: `asaasGateway` (`src/lib/server/payment/asaas.ts`) e `simulatedGateway` (`src/lib/server/payment/simulated.ts`). Em `src/lib/server/app.ts`, a aplicação usa automaticamente o Asaas quando `ASAAS_API_KEY` está definida e cai no simulador em desenvolvimento quando ela está vazia.

## 1. Fluxo

1. O checkout (`startCheckout`) aceita ofertas de pagamento único (`one_time`) e de assinatura mensal (`monthly`, decisão D5), cria o pedido `pending` e a conta do aluno numa transação; depois pede a cobrança ao provedor e grava o `external_id`.
2. Na tela de checkout (`/p/[id]/checkout`), o aluno vê o resumo, a garantia, a política de reembolso em `Disclosure` e digita o CPF/CNPJ com máscara progressiva (`000.000.000-00` ou `00.000.000/0000-00`); em seguida paga o Pix (copia e cola ou QR Code) ou o cartão na página do provedor (`paymentUrl`).
3. O provedor chama `POST /api/webhooks/payment`. A rota autentica o token, traduz o evento e chama `handlePaymentEvent`.
4. `handlePaymentEvent` trava o pedido (`FOR UPDATE`) e decide pelo estado dele, então eventos repetidos ou fora de ordem são ignorados (RN-15). O valor pago precisa ser igual ao do pedido; se não for, a rota responde erro e o provedor reenvia, para alguém olhar.
5. Reembolso aprovado chama `refund` no provedor e só então grava os estornos. Se o provedor falhar, o reembolso fica `approved` e o job diário tenta de novo. Reembolso feito direto no painel do provedor chega como evento `refunded` e é registrado do mesmo jeito. Fora da garantia, `requestRefund` avisa o produtor por e-mail com link direto para `/producer/refunds/[id]`.

O CPF/CNPJ (`taxId`) é pedido no checkout porque o provedor exige, mas não é gravado no banco.

## 2. Mapeamento do adaptador Asaas (`src/lib/server/payment/asaas.ts`)

| Nosso | Asaas |
| --- | --- |
| `customer {name, email, taxId}` | `GET /customers?email=…` e, se não existir, `POST /customers` com `name`, `email`, `cpfCnpj` |
| `createCharge` | `POST /payments` com `billingType` `PIX` ou `CREDIT_CARD`, `value` em reais, `dueDate` em `America/Sao_Paulo`, `externalReference` = id do pedido |
| `Charge.externalId` | `id` da cobrança (`pay_...`) |
| `Charge.pix` | `GET /payments/{id}/pixQrCode`: `payload` e `encodedImage` (vira `data:image/png;base64,...`) |
| `Charge.paymentUrl` | `invoiceUrl` |
| `getCharge` | `GET /payments/{id}` (inclui QR Code quando `billingType === 'PIX'`) |
| `refund` | `POST /payments/{id}/refund` (valor total) |
| token do webhook | cabeçalho `asaas-access-token`, comparado em tempo constante com padding seguro (`verifyAsaasToken`) |

| Evento Asaas | `PaymentEventType` |
| --- | --- |
| `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` | `paid` |
| `PAYMENT_OVERDUE` | `expired` |
| `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS` | `declined` |
| `PAYMENT_REFUNDED` | `refunded` |
| qualquer outro | `null` (a rota responde 200 e ignora) |

`amountCents` vem de `payment.value` convertido para centavos inteiros.

## 3. Como ativar o Asaas (e o Resend) por ambiente

 As variáveis opcionais já estão declaradas em `src/env.ts` e ligadas em `src/lib/server/app.ts`:

1. Defina `ASAAS_API_KEY` no `.env` (e opcionalmente `ASAAS_BASE_URL`; padrão `https://sandbox.asaas.com/api/v3`).
2. No painel do Asaas, cadastre o webhook apontando para `<APP_URL>/api/webhooks/payment` com o cabeçalho `asaas-access-token` igual a `PAYMENT_WEBHOOK_TOKEN`.
3. Para envio transacional real de e-mails (`src/lib/server/email/resend.ts`), defina também `RESEND_API_KEY` e `EMAIL_FROM`. Sem eles, o app usa `logMailer` no console.

Domínio, serviços e rotas não mudam entre o modo simulado e o modo real.

## 4. Simulação em desenvolvimento

- Quando `ASAAS_API_KEY` não está definida, a cobrança simulada tem `externalId` `sim_<id do pedido>` e `paymentUrl` `/dev/payments/<externalId>`.
- `POST /api/dev/payments/<externalId>` com `{"outcome": "paid" | "expired" | "declined"}` dispara o evento como se viesse do provedor. A rota só existe em desenvolvimento.
- O webhook simulado usa o cabeçalho `x-webhook-token`.

## 5. Job diário

`POST /api/jobs/daily` com `Authorization: Bearer <JOBS_TOKEN>`, uma vez por dia (cron do servidor ou agendador da hospedagem). Ele libera retenções vencidas, escala reembolsos sem resposta, tenta de novo reembolsos que falharam no provedor e expira pedidos abandonados. Rodar duas vezes não faz mal.
