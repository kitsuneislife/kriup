// Lot 9.3, RNF-05: the access sweep. Every route of the signed-in area is opened as a
// person of another profile and as another owner of the same profile, and answers 404; an
// anonymous visitor goes to the login. Then the same people POST to the forms of other
// people's resources: each answers 404 and nothing changes in the database.
//
// Two stories (review-seed.ts) give two producers, students, coproducers and support
// people. `one` owns every resource the tests aim at; `two` supplies the other owners.

import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { SESSION_COOKIE, createSession, type SessionUser } from '../src/lib/server/auth/session';
import {
	coproduction,
	lesson,
	lessonProgress,
	message,
	module as courseModule,
	offer,
	page as pageRow,
	payout,
	product,
	refund,
	ticket,
	block,
	auditLog
} from '../src/lib/server/db/schema';
import { createBlock } from '../src/lib/server/services/support';
import { db } from '../src/lib/server/services/testing';
import { eq, inArray, sql } from 'drizzle-orm';
import { expect, test } from './fixtures';
import { seedStory, type Story } from './review-seed';

type Who =
	| 'anonymous'
	| 'producer2'
	| 'student'
	| 'student2'
	| 'coproducer'
	| 'coproducer2'
	| 'producer'
	| 'support'
	| 'support2';

/** The people of the two stories, by what they are to `one`'s resources. */
function people(one: Story, two: Story): Record<Exclude<Who, 'anonymous'>, SessionUser> {
	return {
		producer: one.producer,
		student: one.student,
		coproducer: one.coproducer,
		support: one.support,
		producer2: two.producer,
		student2: two.student,
		coproducer2: two.coproducer,
		support2: two.support
	};
}

async function signedIn(baseURL: string, user?: SessionUser): Promise<APIRequestContext> {
	const headers: Record<string, string> = { origin: baseURL };
	if (user) {
		const { token } = await createSession(db, user.id);
		headers.cookie = `${SESSION_COOKIE}=${token}`;
	}
	return playwrightRequest.newContext({ baseURL, extraHTTPHeaders: headers, maxRedirects: 0 });
}

/** What the actions below must leave untouched. */
async function snapshot(one: Story) {
	const [
		refunds,
		tickets,
		messages,
		terms,
		payouts,
		products,
		modules,
		lessons,
		offers,
		pages,
		progress,
		blocks,
		audits
	] = await Promise.all([
		db.select().from(refund).where(eq(refund.id, one.refundId)),
		db.select().from(ticket).where(eq(ticket.id, one.ticketId)),
		db
			.select({ n: sql<number>`count(*)` })
			.from(message)
			.where(eq(message.ticketId, one.ticketId)),
		db.select().from(coproduction).where(eq(coproduction.id, one.coproductionId)),
		db.select().from(payout).where(eq(payout.userId, one.producer.id)),
		db.select().from(product).where(eq(product.id, one.productId)),
		db.select().from(courseModule).where(eq(courseModule.productId, one.productId)),
		db
			.select()
			.from(lesson)
			.where(
				inArray(
					lesson.moduleId,
					db
						.select({ id: courseModule.id })
						.from(courseModule)
						.where(eq(courseModule.productId, one.productId))
				)
			),
		db.select().from(offer).where(eq(offer.productId, one.productId)),
		db.select().from(pageRow).where(eq(pageRow.productId, one.productId)),
		db.select().from(lessonProgress).where(eq(lessonProgress.userId, one.student.id)),
		db.select().from(block).where(eq(block.userId, one.producer.id)),
		db.select().from(auditLog).where(eq(auditLog.actorId, one.support.id))
	]);
	return JSON.stringify({
		refunds,
		tickets,
		messages,
		terms,
		payouts,
		products,
		modules,
		lessons,
		offers,
		pages,
		progress,
		blocks,
		audits
	});
}

/** `[route, address, who may open it, who must get a 404]` */
type Visit = { route: string; url: string; allowed: Who[]; denied: Who[] };

function visits(one: Story): Visit[] {
	const p = `/producer/products/${one.productId}`;
	const outsiders: Who[] = ['producer2', 'student', 'student2', 'coproducer', 'support'];
	const nonSupport: Who[] = ['producer', 'student', 'coproducer', 'producer2', 'student2'];
	return [
		...['', '/content', '/coproduction', '/offers', '/page', '/preview'].map((tail) => ({
			route: `/(app)/producer/products/[id]${tail}`,
			url: `${p}${tail}`,
			allowed: ['producer' as const],
			denied: outsiders
		})),
		{
			route: '/(app)/producer/refunds/[id]',
			url: `/producer/refunds/${one.refundId}`,
			allowed: ['producer'],
			denied: ['producer2', 'student', 'student2', 'coproducer', 'support']
		},
		{
			route: '/(app)/coproductions/[id]',
			url: `/coproductions/${one.coproductionId}`,
			allowed: ['coproducer'],
			denied: ['producer', 'coproducer2', 'student', 'student2', 'support']
		},
		{
			// the producer previews the course (RF-16)
			route: '/(app)/student/courses/[id]',
			url: `/student/courses/${one.productId}`,
			allowed: ['student', 'producer'],
			denied: ['student2', 'producer2', 'coproducer', 'support']
		},
		{
			route: '/(app)/student/orders/[id]/refund',
			url: `/student/orders/${one.freeOrderId}/refund`,
			allowed: ['student'],
			denied: ['student2', 'producer', 'coproducer', 'support']
		},
		{
			route: '/(app)/student/refunds/[id]',
			url: `/student/refunds/${one.refundId}`,
			allowed: ['student'],
			denied: ['student2', 'producer', 'producer2', 'coproducer', 'support']
		},
		{
			// support reads every ticket (RF-35)
			route: '/(app)/student/tickets/[id]',
			url: `/student/tickets/${one.ticketId}`,
			allowed: ['student', 'support'],
			denied: ['student2', 'producer', 'producer2', 'coproducer']
		},
		...[
			'/support',
			'/support/audit',
			'/support/blocks',
			'/support/metrics',
			'/support/payouts'
		].map((url) => ({
			route: `/(app)${url}`,
			url,
			allowed: ['support' as const, 'support2' as const],
			denied: nonSupport
		})),
		{
			route: '/(app)/support/refunds/[id]',
			url: `/support/refunds/${one.refundId}`,
			allowed: ['support', 'support2'],
			denied: nonSupport
		},
		{
			route: '/(app)/support/tickets/[id]',
			url: `/support/tickets/${one.ticketId}`,
			allowed: ['support', 'support2'],
			denied: nonSupport
		}
	];
}

/** Pages with nothing of anyone else's: the viewer's own data, whoever they are. */
const ownRoutes = [
	'/(app)/account',
	'/(app)/coproductions',
	'/(app)/producer',
	'/(app)/producer/new',
	'/(app)/producer/money',
	'/(app)/producer/money/payouts',
	'/(app)/producer/money/statement',
	'/(app)/producer/refunds',
	'/(app)/student',
	'/(app)/student/orders',
	'/(app)/student/tickets',
	'/(app)/student/tickets/new'
];

test('every route of the signed-in area is covered by the sweep', () => {
	const root = join(process.cwd(), 'src/routes/(app)');
	const found: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) walk(join(dir, entry.name));
			else if (entry.name === '+page.svelte')
				found.push(`/(app)/${relative(root, dir)}`.replace(/\/$/, ''));
		}
	};
	walk(root);
	const covered = new Set([
		...ownRoutes,
		...visits({
			productId: 'x',
			refundId: 'x',
			coproductionId: 'x',
			freeOrderId: 'x',
			ticketId: 'x'
		} as Story).map((v) => v.route)
	]);
	expect(found.filter((r) => !covered.has(r))).toEqual([]);
});

test('other profiles and other owners get a 404, and anonymous visitors the login', async ({
	baseURL,
	ctx,
	createUser
}) => {
	test.slow();
	const [one, two] = [await seedStory(ctx, createUser), await seedStory(ctx, createUser)];
	await db.update(product).set({ name: 'Segredo de Paulo' }).where(eq(product.id, one.productId));
	const who = people(one, two);
	const apis: Record<string, APIRequestContext> = { anonymous: await signedIn(baseURL!) };
	for (const [name, user] of Object.entries(who)) apis[name] = await signedIn(baseURL!, user);
	try {
		const everything = [
			...visits(one),
			...ownRoutes.map((route) => ({
				route,
				url: route.replace('/(app)', ''),
				allowed: [],
				denied: []
			}))
		];
		for (const v of everything) {
			// a stranger to the resource
			for (const name of v.denied) {
				const res = await apis[name]!.get(v.url);
				expect(res.status(), `${name} opens ${v.url}`).toBe(404);
			}
			// the people it is for
			for (const name of v.allowed) {
				const res = await apis[name]!.get(v.url);
				expect(res.status(), `${name} opens ${v.url}`).toBeLessThan(400);
			}
			// nobody signed in
			const anonymous = await apis.anonymous!.get(v.url);
			expect(anonymous.status(), `anonymous opens ${v.url}`).toBe(303);
			expect(anonymous.headers().location, `anonymous opens ${v.url}`).toBe('/login');
		}

		// GET /api/statement/export: anonymous goes to /login; other users never see one.producer's sales
		const anonExport = await apis.anonymous!.get('/api/statement/export');
		expect(anonExport.status(), 'anonymous exports CSV').toBe(303);
		expect(anonExport.headers().location, 'anonymous exports CSV').toBe('/login');

		const ownerExport = await apis.producer!.get('/api/statement/export');
		expect(ownerExport.status(), 'producer exports own CSV').toBe(200);
		expect(await ownerExport.text()).toContain('Segredo de Paulo');

		const csvHeaderOnly = '\uFEFFData;Produto;Tipo;Regra aplicada;Estado;Valor (R$)';
		const studentExport = await apis.student!.get('/api/statement/export');
		expect(studentExport.status(), 'student exports CSV').toBe(200);
		expect(await studentExport.text()).toBe(csvHeaderOnly);

		const filteredStrangerExport = await apis.producer2!.get(
			`/api/statement/export?product=${one.productId}`
		);
		expect(filteredStrangerExport.status(), 'producer2 exports victim product CSV').toBe(200);
		expect(await filteredStrangerExport.text()).toBe(csvHeaderOnly);

		const strangerExport = await apis.producer2!.get('/api/statement/export');
		expect(strangerExport.status(), 'producer2 exports own CSV').toBe(200);
		expect(await strangerExport.text()).not.toContain('Segredo de Paulo');
	} finally {
		await Promise.all(Object.values(apis).map((a) => a.dispose()));
	}
});

test('forms of other people resources answer 404 and change nothing', async ({
	baseURL,
	ctx,
	createUser
}) => {
	test.slow();
	const [one, two] = [await seedStory(ctx, createUser), await seedStory(ctx, createUser)];
	const who = people(one, two);
	const apis: Record<string, APIRequestContext> = { anonymous: await signedIn(baseURL!) };
	for (const [name, user] of Object.entries(who)) apis[name] = await signedIn(baseURL!, user);

	const [mod] = await db
		.select()
		.from(courseModule)
		.where(eq(courseModule.productId, one.productId));
	const [les] = await db.select().from(lesson).where(eq(lesson.moduleId, mod!.id));
	const [off] = await db.select().from(offer).where(eq(offer.productId, one.productId));
	const [pay] = await db.select().from(payout).where(eq(payout.userId, one.producer.id));
	const active = await createBlock(ctx, one.support.id, {
		userId: one.producer.id,
		target: 'balance',
		reason: 'Conferência de dados.',
		nextStep: 'Envie o documento.'
	});
	const p = `/producer/products/${one.productId}`;
	// the same actions through the stranger's own product, naming the victim's ids
	const own = `/producer/products/${two.productId}`;

	type Attack = { by: Who[]; path: string; form?: Record<string, string> };
	const attacks: Attack[] = [];
	const outsiders: Who[] = ['producer2', 'student', 'student2', 'coproducer', 'support'];
	const nonSupport: Who[] = ['producer', 'student', 'coproducer', 'producer2', 'student2'];
	const add = (by: Who[], path: string, form?: Record<string, string>) =>
		attacks.push({ by, path, form });

	// editor of the product
	add(outsiders, `${p}?/update`, {
		name: 'Roubado',
		refundPolicy: 'x',
		color: '#000000',
		font: 'Inter',
		logoUrl: ''
	});
	add(outsiders, `${p}?/publish`);
	add(outsiders, `${p}/page?/save`, {});
	add(outsiders, `${p}/page?/save&type=checkout`, {});
	add(outsiders, `${p}/page?/save&type=access_email`, {});
	add(outsiders, `${p}/offers?/addOffer`, {
		name: 'Oferta falsa',
		price: '97,00',
		guaranteeDays: '7'
	});
	add(outsiders, `${p}/content?/addModule`, { title: 'Módulo falso' });
	for (const base of [p, own]) {
		add(['producer2'], `${base}/offers?/updateOffer&id=${off!.id}`, {
			name: 'Roubada',
			price: '97,00',
			guaranteeDays: '7'
		});
		add(['producer2'], `${base}/offers?/deleteOffer&id=${off!.id}`);
		add(['producer2'], `${base}/content?/renameModule&id=${mod!.id}`, { title: 'Roubado' });
		add(['producer2'], `${base}/content?/deleteModule&id=${mod!.id}`);
		add(['producer2'], `${base}/content?/moveModule&id=${mod!.id}`, { direction: 'down' });
		add(['producer2'], `${base}/content?/addLesson&id=${mod!.id}`, { title: 'Aula falsa' });
		add(['producer2'], `${base}/content?/updateLesson&id=${les!.id}`, {
			title: 'Roubada',
			videoUrl: '',
			body: '',
			attachmentUrl: ''
		});
		add(['producer2'], `${base}/content?/deleteLesson&id=${les!.id}`);
		add(['producer2'], `${base}/content?/moveLesson&id=${les!.id}`, { direction: 'down' });
		add(['producer2'], `${base}/coproduction?/cancel&id=${one.coproductionId}`);
	}
	for (const who of ['student', 'coproducer', 'support'] as const) {
		add([who], `${p}/offers?/deleteOffer&id=${off!.id}`);
		add([who], `${p}/content?/deleteModule&id=${mod!.id}`);
		add([who], `${p}/content?/deleteLesson&id=${les!.id}`);
	}
	add(outsiders, `${p}/coproduction?/invite`, {
		email: 'intruso@e2e.test',
		name: 'Intruso',
		percent: '10',
		durationDays: ''
	});
	add(
		['student', 'student2', 'coproducer2', 'support'],
		`${p}/coproduction?/cancel&id=${one.coproductionId}`
	);

	// refund decisions
	add(
		['producer2', 'student', 'coproducer', 'support', 'student2'],
		`/producer/refunds/${one.refundId}?/approve`
	);
	add(
		['producer2', 'student', 'coproducer', 'support', 'student2'],
		`/producer/refunds/${one.refundId}?/decline`,
		{ reason: 'Não.' }
	);
	add(['producer2', 'student2', 'coproducer'], `/producer/refunds/${one.refundId}?/message`, {
		body: 'Oi'
	});
	add(
		['student2', 'producer', 'producer2', 'coproducer'],
		`/student/refunds/${one.refundId}?/contest`
	);
	add(['student2', 'producer2', 'coproducer'], `/student/refunds/${one.refundId}?/message`, {
		body: 'Oi'
	});
	add(
		['student2', 'producer', 'coproducer', 'support'],
		`/student/orders/${one.freeOrderId}/refund`,
		{ reason: 'Quero o dinheiro de volta.' }
	);

	// coproduction contract
	add(
		['producer', 'coproducer2', 'student', 'support'],
		`/coproductions/${one.coproductionId}?/accept`
	);
	add(['coproducer2', 'student', 'support'], `/coproductions/${one.coproductionId}?/refuse`);

	// course
	add(
		['student2', 'producer2', 'coproducer', 'support'],
		`/student/courses/${one.productId}?/done&lesson=${les!.id}`,
		{ done: '1' }
	);

	// tickets
	add(
		['student2', 'producer', 'producer2', 'coproducer'],
		`/student/tickets/${one.ticketId}?/send`,
		{ body: 'Oi' }
	);
	add(
		['student2', 'producer', 'producer2', 'coproducer'],
		`/student/tickets/${one.ticketId}?/close`
	);
	add(['student2'], '/student/tickets/new', {
		orderId: one.freeOrderId,
		subject: 'Falso',
		body: 'Em nome de outro.'
	});

	// support only
	add(nonSupport, `/support/refunds/${one.refundId}?/approve`);
	add(nonSupport, `/support/refunds/${one.refundId}?/decline`, { reason: 'Não.' });
	add(nonSupport, `/support/refunds/${one.refundId}?/message`, { body: 'Oi' });
	add(nonSupport, `/support/tickets/${one.ticketId}?/send`, { body: 'Oi' });
	add(nonSupport, `/support/tickets/${one.ticketId}?/close`);
	add(nonSupport, '/support/blocks?/block', {
		userId: one.producer.id,
		choice: 'balance',
		reason: 'x',
		nextStep: 'y'
	});
	add(nonSupport, '/support/blocks?/lift', {
		blockId: active
	});
	add(nonSupport, '/support/payouts?/complete', { id: pay!.id });
	add(nonSupport, '/support/payouts?/decline', { id: pay!.id, reason: 'x' });

	const before = await snapshot(one);
	try {
		for (const attack of attacks) {
			for (const name of attack.by) {
				const res = await apis[name]!.post(attack.path, { form: attack.form ?? {} });
				expect.soft(res.status(), `${name} posts ${attack.path}`).toBe(404);
			}
		}
		// nobody signed in: sent to the login, or 404 on the support area, never a success
		for (const attack of attacks) {
			const res = await apis.anonymous!.post(attack.path, {
				form: attack.form ?? {},
				headers: { accept: 'text/html' }
			});
			expect([303, 404], `anonymous posts ${attack.path}`).toContain(res.status());
			if (res.status() === 303) expect(res.headers().location).toBe('/login');
		}
		expect(await snapshot(one)).toBe(before);
	} finally {
		await Promise.all(Object.values(apis).map((a) => a.dispose()));
	}
});
