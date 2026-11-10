# Pagamentos

O sistema fala com o provedor de pagamento só pela interface `PaymentGateway` (`src/lib/server/payment/gateway.ts`). Hoje roda a implementação simulada; a interface foi desenhada a partir da API do Asaas, para que a troca seja um arquivo novo e uma linha em `src/lib/server/app.ts`.

## 1. Fluxo

1. O checkout (`startCheckout`) cria o pedido `pending` e a conta do aluno numa transação; depois pede a cobrança ao provedor e grava o `external_id`.
2. O aluno paga o Pix (copia e cola ou QR Code) ou o cartão na página do provedor (`paymentUrl`).
3. O provedor chama `POST /api/webhooks/payment`. A rota autentica o token, traduz o evento e chama `handlePaymentEvent`.
4. `handlePaymentEvent` trava o pedido (`FOR UPDATE`) e decide pelo estado dele, então eventos repetidos ou fora de ordem são ignorados (RN-15). O valor pago precisa ser igual ao do pedido; se não for, a rota responde erro e o provedor reenvia, para alguém olhar.
5. Reembolso aprovado chama `refund` no provedor e só então grava os estornos. Se o provedor falhar, o reembolso fica `approved` e o job diário tenta de novo. Reembolso feito direto no painel do provedor chega como evento `refunded` e é registrado do mesmo jeito.

O CPF/CNPJ (`taxId`) é pedido no checkout porque o provedor exige, mas não é gravado no banco.

## 2. Mapeamento para o Asaas

| Nosso | Asaas |
| --- | --- |
| `customer {name, email, taxId}` | `POST /customers` com `name`, `email`, `cpfCnpj` (reaproveite pelo e-mail) |
| `createCharge` | `POST /payments` com `billingType` `PIX` ou `CREDIT_CARD`, `value` em reais, `dueDate`, `externalReference` = id do pedido |
| `Charge.externalId` | `id` da cobrança (`pay_...`) |
| `Charge.pix` | `GET /payments/{id}/pixQrCode`: `payload` e `encodedImage` (vira `data:image/png;base64,...`) |
| `Charge.paymentUrl` | `invoiceUrl` |
| `getCharge` | `GET /payments/{id}` |
| `refund` | `POST /payments/{id}/refund` (valor total) |
| token do webhook | cabeçalho `asaas-access-token`, comparado em tempo constante |

| Evento Asaas | `PaymentEventType` |
| --- | --- |
| `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` | `paid` |
| `PAYMENT_OVERDUE` | `expired` |
| `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS` | `declined` |
| `PAYMENT_REFUNDED` | `refunded` |
| qualquer outro | `null` (a rota responde 200 e ignora) |

`amountCents` vem de `payment.value` convertido para centavos.

## 3. Como trocar para o Asaas

1. Crie `src/lib/server/payment/asaas.ts` com `asaasGateway({ apiKey, baseUrl, webhookToken })` implementando `PaymentGateway` com a tabela acima.
2. Declare `ASAAS_API_KEY` e `ASAAS_BASE_URL` em `src/env.ts` (sandbox: `https://sandbox.asaas.com/api/v3`).
3. Em `src/lib/server/app.ts`, troque `simulatedGateway(...)` por `asaasGateway(...)`.
4. No painel do Asaas, cadastre o webhook apontando para `/api/webhooks/payment` com o mesmo token de `PAYMENT_WEBHOOK_TOKEN`.

Domínio, serviços e testes não mudam.

## 4. Simulação em desenvolvimento

- A cobrança simulada tem `externalId` `sim_<id do pedido>` e `paymentUrl` `/dev/payments/<externalId>`.
- `POST /api/dev/payments/<externalId>` com `{"outcome": "paid" | "expired" | "declined"}` dispara o evento como se viesse do provedor. A rota só existe em desenvolvimento.
- O webhook simulado usa o cabeçalho `x-webhook-token`.

## 5. Job diário

`POST /api/jobs/daily` com `Authorization: Bearer <JOBS_TOKEN>`, uma vez por dia (cron do servidor ou agendador da hospedagem). Ele libera retenções vencidas, escala reembolsos sem resposta, tenta de novo reembolsos que falharam no provedor e expira pedidos abandonados. Rodar duas vezes não faz mal.
