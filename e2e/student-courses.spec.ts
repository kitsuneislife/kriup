// UC-03: the student's courses with progress, and the player that marks lessons as done.

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { updateLesson } from '../src/lib/server/services/catalog';
import { user } from '../src/lib/server/db/schema';
import { getCourse } from '../src/lib/server/services/members';
import { requestRefund } from '../src/lib/server/services/refunds';
import { db } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, publishedProduct, test } from './fixtures';

type Ctx = Parameters<typeof publishedProduct>[0];

/** A published course and a student who bought it; the buyer's account comes from the purchase. */
async function enrolled(ctx: Ctx, producerId: string) {
	const { productId, offerId } = await publishedProduct(ctx, producerId);
	const email = `bia.${randomUUID()}@e2e.test`;
	const orderId = await buy(ctx, offerId, email);
	const [row] = await db.select().from(user).where(eq(user.email, email));
	const student = { id: row!.id, email, name: row!.name, platformRole: row!.platformRole };
	const course = await getCourse(ctx, producerId, productId);
	return { productId, orderId, student, lessons: course.modules.flatMap((m) => m.lessons) };
}

test('lists the course with progress and plays lessons until it is finished', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // several saves and axe checks
	const producer = await createUser('Paulo Lima');
	const { productId, student, lessons } = await enrolled(ctx, producer.id);
	const [first, second] = lessons;
	expect(lessons.length).toBeGreaterThan(1);
	await signIn(student);

	await page.goto('/student');
	await expect(page.getByRole('heading', { name: 'Meus cursos', level: 1 })).toBeVisible();
	await expect(page.getByText('Curso', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Curso de pão', level: 2 })).toBeVisible();
	await expect(page.getByText(`0 de ${lessons.length} aulas concluídas`)).toBeVisible();
	await expectAccessible(page);

	// "Começar" opens the first lesson
	await page.getByRole('link', { name: 'Começar: Curso de pão' }).click();
	await expect(page).toHaveURL(new RegExp(`lesson=${first!.id}`));
	await expect(page.getByText(`Boas-vindas · Aula 1 de ${lessons.length}`)).toBeVisible();
	await expect(page.getByRole('heading', { name: first!.title, level: 2 })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Aula anterior' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: first!.title })).toHaveAttribute(
		'aria-current',
		'true'
	);
	await expectAccessible(page);

	// done: the button flips and the progress moves, and the lesson stays on screen
	await page.getByRole('button', { name: 'Marcar como concluída' }).click();
	await expect(page.getByRole('button', { name: 'Concluída, desfazer' })).toBeVisible();
	await expect(page.getByText(`1 de ${lessons.length} aulas concluídas`)).toBeVisible();
	await expect(page.getByRole('heading', { name: first!.title, level: 2 })).toBeVisible();

	// the next lesson, then back via "Aula anterior"
	await page.getByRole('link', { name: 'Próxima aula' }).click();
	await expect(page.getByText(`Boas-vindas · Aula 2 de ${lessons.length}`)).toBeVisible();
	await expect(page.getByRole('heading', { name: second!.title, level: 2 })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Marcar como concluída' })).toBeVisible();
	await page.getByRole('link', { name: 'Aula anterior' }).click();
	await expect(page.getByRole('heading', { name: first!.title, level: 2 })).toBeVisible();

	// undo
	await page.getByRole('button', { name: 'Concluída, desfazer' }).click();
	await expect(page.getByRole('button', { name: 'Marcar como concluída' })).toBeVisible();
	await expect(page.getByText(`0 de ${lessons.length} aulas concluídas`)).toBeVisible();

	// finish everything: the completion banner appears and the course shows as done on the list
	for (const lesson of lessons) {
		// a click on the lesson already open reloads it, and that load could land after the save
		if (!page.url().includes(`lesson=${lesson.id}`)) {
			await page.getByRole('link', { name: lesson.title }).click();
		}
		await expect(page.getByRole('heading', { name: lesson.title, level: 2 })).toBeVisible();
		await page.getByRole('button', { name: 'Marcar como concluída' }).click();
		await expect(page.getByRole('button', { name: 'Concluída, desfazer' })).toBeVisible();
	}
	await expect(page.getByText('100%')).toBeVisible();
	await expect(page.getByText('Curso concluído!')).toBeVisible();
	await expect(page.getByText('Você concluiu todas as aulas deste curso.')).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Meus cursos', exact: true }).first().click();
	await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Rever aulas: Curso de pão' })).toBeVisible();
	await expectAccessible(page);

	// all done: a reopened course starts at the first lesson
	await page.goto(`/student/courses/${productId}`);
	await expect(page.getByRole('heading', { name: first!.title, level: 2 })).toBeVisible();
});

test('opens on the first lesson not done', async ({ page, ctx, createUser, signIn }) => {
	const producer = await createUser('Paulo Lima');
	const { productId, student, lessons } = await enrolled(ctx, producer.id);
	await signIn(student);
	await page.goto(`/student/courses/${productId}`);
	await page.getByRole('button', { name: 'Marcar como concluída' }).click();
	await expect(page.getByRole('button', { name: 'Concluída, desfazer' })).toBeVisible();

	await page.goto('/student');
	await page.getByRole('link', { name: 'Continuar: Curso de pão' }).click();
	await expect(page.getByRole('heading', { name: lessons[1]!.title, level: 2 })).toBeVisible();
	// an unknown lesson falls back to the same one
	await page.goto(`/student/courses/${productId}?lesson=${randomUUID()}`);
	await expect(page.getByRole('heading', { name: lessons[1]!.title, level: 2 })).toBeVisible();
});

test('shows the video, the text and the material of a lesson', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // two axe checks with a cold dev server
	const producer = await createUser('Paulo Lima');
	const { productId, student, lessons } = await enrolled(ctx, producer.id);
	const lesson = lessons[0]!;
	await updateLesson(ctx, producer.id, lesson.id, {
		title: lesson.title,
		videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		body: 'Primeiro parágrafo da aula.\n\nSegundo parágrafo.',
		attachmentUrl: 'https://example.com/receita.pdf'
	});
	await signIn(student);
	// the suite never loads the real player: it is a third party page, and axe would judge it
	await page.route('https://www.youtube-nocookie.com/**', (route) =>
		route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>player</title>' })
	);
	await page.goto(`/student/courses/${productId}`);
	await expect(page.locator('iframe')).toHaveAttribute(
		'src',
		'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
	);
	await expect(page.getByText('Primeiro parágrafo da aula.')).toBeVisible();
	await expect(page.getByText('Segundo parágrafo.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Baixar material' })).toHaveAttribute(
		'href',
		'https://example.com/receita.pdf'
	);
	await expectAccessible(page);

	// a video that cannot be embedded opens on its own page
	await updateLesson(ctx, producer.id, lesson.id, {
		title: lesson.title,
		videoUrl: 'https://example.com/aula',
		body: null,
		attachmentUrl: null
	});
	await page.reload();
	await expect(page.locator('iframe')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Abrir vídeo' })).toHaveAttribute(
		'href',
		'https://example.com/aula'
	);
	await expectAccessible(page);
});

test('tells a student with no purchases where the courses will be', async ({
	page,
	createUser,
	signIn
}) => {
	await signIn(await createUser('Caio Alves'));
	await page.goto('/student');
	await expect(page.getByText('Você ainda não tem cursos')).toBeVisible();
	await expectAccessible(page);
});

test('another student gets a 404 on a course they did not buy', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { productId, lessons } = await enrolled(ctx, producer.id);
	await signIn(await createUser('Caio Alves'));

	const response = await page.goto(`/student/courses/${productId}`);
	expect(response?.status()).toBe(404);
	await page.goto(`/student/courses/${productId}?lesson=${lessons[0]!.id}`);
	await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();

	// nor can they mark its lessons through the form
	const marked = await page.request.post(
		`/student/courses/${productId}?/done&lesson=${lessons[0]!.id}`,
		{
			form: { done: '1' },
			headers: { origin: new URL(page.url()).origin }
		}
	);
	expect(marked.status()).toBe(404);
});

test('a refund closes the course', async ({ page, ctx, createUser, signIn }) => {
	const producer = await createUser('Paulo Lima');
	const { productId, orderId, student } = await enrolled(ctx, producer.id);
	await signIn(student);
	await page.goto(`/student/courses/${productId}`);
	await expect(page.getByRole('heading', { name: 'Curso de pão', level: 1 })).toBeVisible();

	// inside the guarantee the refund is approved at once and the access goes away
	await requestRefund(ctx, student.id, { orderId, reason: 'Não era o que eu queria' });
	const response = await page.goto(`/student/courses/${productId}`);
	expect(response?.status()).toBe(404);
	await page.goto('/student');
	await expect(page.getByText('Você ainda não tem cursos')).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('picks a lesson and marks it as done', async ({ page, ctx, createUser, signIn }) => {
		const producer = await createUser('Paulo Lima');
		const { productId, student, lessons } = await enrolled(ctx, producer.id);
		await signIn(student);
		await page.goto(`/student/courses/${productId}`);
		await page.getByRole('link', { name: lessons[1]!.title }).click();
		await expect(page.getByRole('heading', { name: lessons[1]!.title, level: 2 })).toBeVisible();

		await page.getByRole('button', { name: 'Marcar como concluída' }).click();
		await expect(page.getByRole('button', { name: 'Concluída, desfazer' })).toBeVisible();
		await expect(page.getByRole('heading', { name: lessons[1]!.title, level: 2 })).toBeVisible();
		await expect(page.getByText(`1 de ${lessons.length} aulas concluídas`)).toBeVisible();
	});
});
