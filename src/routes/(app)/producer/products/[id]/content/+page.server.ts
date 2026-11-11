import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { move } from '#lib/domain/page';
import { ctx } from '#lib/server/app';
import { act, orNotFound, requireUser } from '#lib/server/http';
import {
	addLesson,
	addModule,
	deleteLesson,
	deleteModule,
	getProductEditor,
	lessonSchema,
	renameModule,
	reorderLessons,
	reorderModules,
	updateLesson
} from '#lib/server/services/catalog';
import { answer, formText as text, idOf } from '../answer';
import type { Actions, PageServerLoad } from './$types';

// RF-14. The answers are for `module:<id>`, `lesson:<id>`, `new-module`,
// `new-lesson:<module id>`, `move:<id>` or `delete:<id>` (see ../answer.ts).

export const load: PageServerLoad = async ({ locals, params }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	return {
		product: { name: editor.product.name },
		modules: editor.modules.map((m) => ({
			id: m.id,
			title: m.title,
			lessons: m.lessons.map(({ id, title, videoUrl, body, attachmentUrl }) => ({
				id,
				title,
				videoUrl,
				body,
				attachmentUrl
			}))
		}))
	};
};

const direction = (form: FormData) => z.enum(['up', 'down']).parse(form.get('direction'));

/** A lesson as the form sends it: the optional fields left empty become null. */
const lessonForm = z.object({
	title: z.string(),
	videoUrl: z
		.string()
		.trim()
		.transform((t) => t || null),
	body: z.string().transform((t) => (t.trim() ? t : null)),
	attachmentUrl: z
		.string()
		.trim()
		.transform((t) => t || null)
});

const lessonKeys = Object.keys(lessonSchema.shape) as (keyof typeof lessonForm.shape)[];

export const actions: Actions = {
	addModule: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const title = text(await request.formData(), 'title');
		const added = await act(() => addModule(ctx, user.id, params.id, title));
		return answer(added, 'new-module', added.ok ? undefined : { title });
	},

	renameModule: async ({ locals, request, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		const title = text(await request.formData(), 'title');
		const renamed = await act(() => renameModule(ctx, user.id, id, title));
		return answer(renamed, `module:${id}`, renamed.ok ? undefined : { title });
	},

	deleteModule: async ({ locals, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		return answer(await act(() => deleteModule(ctx, user.id, id)), `delete:${id}`);
	},

	moveModule: async ({ locals, params, request, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		const to = direction(await request.formData());
		const moved = await act(async () => {
			const { modules } = await getProductEditor(ctx, user.id, params.id);
			const ids = modules.map((m) => m.id);
			if (!ids.includes(id)) error(404);
			await reorderModules(ctx, user.id, params.id, move(ids, ids.indexOf(id), to));
		});
		return answer(moved, `move:${id}`);
	},

	addLesson: async ({ locals, request, url }) => {
		const user = requireUser(locals);
		const moduleId = idOf(url);
		const title = text(await request.formData(), 'title');
		const added = await act(() => addLesson(ctx, user.id, moduleId, { title }));
		return answer(added, `new-lesson:${moduleId}`, added.ok ? undefined : { title });
	},

	updateLesson: async ({ locals, request, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		const form = await request.formData();
		const typed = Object.fromEntries(lessonKeys.map((key) => [key, text(form, key)]));
		const updated = await act(() => updateLesson(ctx, user.id, id, lessonForm.parse(typed)));
		return answer(updated, `lesson:${id}`, updated.ok ? undefined : typed);
	},

	deleteLesson: async ({ locals, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		return answer(await act(() => deleteLesson(ctx, user.id, id)), `delete:${id}`);
	},

	moveLesson: async ({ locals, params, request, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		const to = direction(await request.formData());
		const moved = await act(async () => {
			const { modules } = await getProductEditor(ctx, user.id, params.id);
			const owner = modules.find((m) => m.lessons.some((l) => l.id === id));
			if (!owner) error(404);
			const ids = owner.lessons.map((l) => l.id);
			await reorderLessons(ctx, user.id, owner.id, move(ids, ids.indexOf(id), to));
		});
		return answer(moved, `move:${id}`);
	}
};
