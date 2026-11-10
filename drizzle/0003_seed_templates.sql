-- RF-10, RF-11: the templates the wizard offers. `{{productName}}`, `{{audience}}` and
-- `{{price}}` are filled from the wizard answers (domain/draft.ts). Re-running updates
-- them by slug; products already created keep their own copy.

INSERT INTO "template" ("slug", "name", "product_type", "structure") VALUES
(
	'online-course',
	'Curso online',
	'course',
	$json${
		"pages": {
			"sales": { "sections": [
				{ "kind": "hero", "fields": {
					"title": "{{productName}}",
					"subtitle": "O curso feito para {{audience}}, do primeiro passo ao resultado.",
					"cta": "Quero começar por {{price}}"
				} },
				{ "kind": "benefits", "fields": {
					"title": "O que você vai aprender",
					"item1": "O básico explicado sem complicação",
					"item2": "Exercícios práticos em cada módulo",
					"item3": "Acesso às aulas no seu ritmo"
				} },
				{ "kind": "guarantee", "fields": {
					"title": "Garantia de 7 dias",
					"text": "Se não for para você, peça o reembolso em até 7 dias e receba todo o valor de volta."
				} },
				{ "kind": "faq", "fields": {
					"question1": "Por quanto tempo tenho acesso?",
					"answer1": "Enquanto a compra estiver ativa, sem prazo para terminar.",
					"question2": "Como recebo o acesso?",
					"answer2": "Por e-mail, logo depois da confirmação do pagamento."
				} }
			] },
			"checkout": { "sections": [
				{ "kind": "summary", "fields": {
					"title": "Você está comprando {{productName}}",
					"note": "Pagamento seguro por Pix ou cartão. Acesso imediato após a confirmação."
				} }
			] },
			"access_email": { "sections": [
				{ "kind": "email", "fields": {
					"subject": "Seu acesso a {{productName}} chegou",
					"body": "Que bom ter você em {{productName}}! Seu pagamento foi confirmado e as aulas já estão liberadas."
				} }
			] }
		},
		"refundPolicy": "Você pode pedir o reembolso de {{productName}} em até 7 dias corridos após a confirmação do pagamento, sem precisar justificar, e recebe todo o valor de volta. Depois desse prazo, o pedido é analisado pelo produtor em até 3 dias.",
		"modules": [
			{ "title": "Boas-vindas", "lessons": [ { "title": "Comece por aqui" }, { "title": "Como aproveitar o curso" } ] },
			{ "title": "Fundamentos", "lessons": [ { "title": "Primeira aula" }, { "title": "Exercício prático" } ] },
			{ "title": "Próximos passos", "lessons": [ { "title": "Encerramento" } ] }
		]
	}$json$::jsonb
),
(
	'mentorship',
	'Mentoria',
	'mentorship',
	$json${
		"pages": {
			"sales": { "sections": [
				{ "kind": "hero", "fields": {
					"title": "{{productName}}",
					"subtitle": "Acompanhamento próximo para {{audience}}, com encontros ao vivo e plano de ação.",
					"cta": "Garantir minha vaga por {{price}}"
				} },
				{ "kind": "benefits", "fields": {
					"title": "Como funciona",
					"item1": "Encontros ao vivo em grupo",
					"item2": "Plano de ação personalizado",
					"item3": "Gravações e materiais na área de membros"
				} },
				{ "kind": "guarantee", "fields": {
					"title": "Garantia de 7 dias",
					"text": "Participe da primeira semana. Se não fizer sentido, peça o reembolso em até 7 dias."
				} }
			] },
			"checkout": { "sections": [
				{ "kind": "summary", "fields": {
					"title": "Sua vaga em {{productName}}",
					"note": "Pagamento seguro por Pix ou cartão. Você recebe as instruções por e-mail."
				} }
			] },
			"access_email": { "sections": [
				{ "kind": "email", "fields": {
					"subject": "Sua vaga em {{productName}} está garantida",
					"body": "Bem-vindo à {{productName}}! Na área de membros estão o calendário dos encontros e os primeiros materiais."
				} }
			] }
		},
		"refundPolicy": "Você pode pedir o reembolso de {{productName}} em até 7 dias corridos após a confirmação do pagamento e recebe todo o valor de volta. Depois desse prazo, o pedido é analisado pelo produtor em até 3 dias.",
		"modules": [
			{ "title": "Antes do primeiro encontro", "lessons": [ { "title": "Boas-vindas e combinados" } ] },
			{ "title": "Encontros", "lessons": [ { "title": "Encontro 1" } ] }
		]
	}$json$::jsonb
)
ON CONFLICT ("slug") DO UPDATE SET
	"name" = EXCLUDED."name",
	"product_type" = EXCLUDED."product_type",
	"structure" = EXCLUDED."structure";
