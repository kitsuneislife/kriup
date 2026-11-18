-- RF-10, RF-11: additional product templates for subscriptions and hands-on workshops.
-- `{{productName}}`, `{{audience}}` and `{{price}}` are filled from the wizard answers
-- (domain/draft.ts). Re-running updates them by slug; existing products keep their copy.

INSERT INTO "template" ("slug", "name", "product_type", "structure") VALUES
(
	'subscription-club',
	'Clube de assinatura',
	'subscription',
	$json${
		"pages": {
			"sales": { "sections": [
				{ "kind": "hero", "fields": {
					"title": "{{productName}}",
					"subtitle": "Conteúdo contínuo e novos materiais todo mês para {{audience}}.",
					"cta": "Assinar agora por {{price}}"
				} },
				{ "kind": "benefits", "fields": {
					"title": "O que você encontra no clube",
					"item1": "Novos conteúdos publicados todo mês",
					"item2": "Acervo completo liberado desde o primeiro dia",
					"item3": "Acesso contínuo enquanto a assinatura estiver ativa"
				} },
				{ "kind": "guarantee", "fields": {
					"title": "Garantia de 7 dias",
					"text": "Experimente o clube por 7 dias. Se não for para você, peça o reembolso integral e cancele as próximas renovações sem burocracia."
				} },
				{ "kind": "faq", "fields": {
					"question1": "Como funciona a renovação?",
					"answer1": "A assinatura é renovada automaticamente a cada ciclo, e você pode cancelar as próximas cobranças quando quiser.",
					"question2": "Quando recebo o acesso?",
					"answer2": "Por e-mail, logo após a confirmação do pagamento."
				} }
			] },
			"checkout": { "sections": [
				{ "kind": "summary", "fields": {
					"title": "Você está assinando {{productName}}",
					"note": "Pagamento seguro por Pix ou cartão. Acesso imediato após a confirmação."
				} }
			] },
			"access_email": { "sections": [
				{ "kind": "email", "fields": {
					"subject": "Seu acesso ao clube {{productName}} está liberado",
					"body": "Que bom ter você em {{productName}}! Sua assinatura foi confirmada e o conteúdo do mês já está disponível na área de membros."
				} }
			] }
		},
		"refundPolicy": "Você pode pedir o reembolso da primeira cobrança de {{productName}} em até 7 dias corridos após a confirmação do pagamento e recebe todo o valor de volta, com o cancelamento das renovações futuras. Você também pode cancelar próximas renovações a qualquer momento; depois dos 7 dias iniciais, pedidos de reembolso são analisados pelo produtor em até 3 dias.",
		"modules": [
			{ "title": "Comece por aqui", "lessons": [ { "title": "Boas-vindas ao clube" }, { "title": "Como aproveitar cada mês" } ] },
			{ "title": "Conteúdo do mês", "lessons": [ { "title": "Tema principal do mês" }, { "title": "Material complementar" } ] }
		]
	}$json$::jsonb
),
(
	'workshop',
	'Oficina prática',
	'course',
	$json${
		"pages": {
			"sales": { "sections": [
				{ "kind": "hero", "fields": {
					"title": "{{productName}}",
					"subtitle": "Uma oficina mão na massa para {{audience}} sair com um projeto pronto.",
					"cta": "Participar da oficina por {{price}}"
				} },
				{ "kind": "benefits", "fields": {
					"title": "O que vamos construir juntos",
					"item1": "Lista clara de materiais e preparação rápida",
					"item2": "Passo a passo direto ao ponto, sem enrolação",
					"item3": "Projeto prático concluído ao fim da oficina"
				} },
				{ "kind": "guarantee", "fields": {
					"title": "Garantia de 7 dias",
					"text": "Assista e pratique sem risco. Se não for o que você esperava, peça o reembolso em até 7 dias e receba todo o valor de volta."
				} },
				{ "kind": "faq", "fields": {
					"question1": "Preciso de experiência prévia?",
					"answer1": "Não. A oficina mostra a preparação inicial e guia cada etapa na prática.",
					"question2": "Por quanto tempo tenho acesso à gravação e aos materiais?",
					"answer2": "Enquanto a compra estiver ativa, para rever e consultar sempre que precisar."
				} }
			] },
			"checkout": { "sections": [
				{ "kind": "summary", "fields": {
					"title": "Sua inscrição em {{productName}}",
					"note": "Pagamento seguro por Pix ou cartão. Acesso imediato aos materiais após a confirmação."
				} }
			] },
			"access_email": { "sections": [
				{ "kind": "email", "fields": {
					"subject": "Seu acesso à oficina {{productName}} chegou",
					"body": "Tudo pronto para começar {{productName}}! Acesse a área de membros para ver a lista de preparação e dar o primeiro passo."
				} }
			] }
		},
		"refundPolicy": "Você pode pedir o reembolso de {{productName}} em até 7 dias corridos após a confirmação do pagamento, sem precisar justificar, e recebe todo o valor de volta. Depois desse prazo, o pedido é analisado pelo produtor em até 3 dias.",
		"modules": [
			{ "title": "Preparação e materiais", "lessons": [ { "title": "O que separar antes de começar" } ] },
			{ "title": "Mão na massa", "lessons": [ { "title": "Etapa prática passo a passo" }, { "title": "Ajustes e acabamento" } ] },
			{ "title": "Resultado final", "lessons": [ { "title": "Revisão e próximos passos" } ] }
		]
	}$json$::jsonb
)
ON CONFLICT ("slug") DO UPDATE SET
	"name" = EXCLUDED."name",
	"product_type" = EXCLUDED."product_type",
	"structure" = EXCLUDED."structure";
