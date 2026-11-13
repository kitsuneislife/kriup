import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { z } from 'zod';
import { ctx } from '#lib/server/app';
import { act, orNotFound, requireUser } from '#lib/server/http';
import { getCourse, setLessonDone } from '#lib/server/services/members';
import type { Actions, PageServerLoad } from './$types';
import { pickLesson } from './player';

// RF-23. The lesson on screen is `?lesson=<id>`; without it the first one not done opens.
// An unknown or missing lesson redirects to the one that opens. The form posts to `?/done&lesson=<id>`, so without JavaScript the answer shows that lesson.

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const course = await orNotFound(getCourse(ctx, requireUser(locals).id, params.id));
	const flat = course.modules.flatMap((m) => m.lessons);
	const current = pickLesson(flat, url.searchParams.get('lesson'));
	// the address always names the lesson, so marking one done does not jump to another
	if (current && url.searchParams.get('lesson') !== current.id) {
		redirect(
			303,
			`${resolve('/(app)/student/courses/[id]', { id: params.id })}?lesson=${current.id}`
		);
	}
	const next = current ? flat[flat.indexOf(current) + 1] : undefined;
	return {
		product: course.product,
		lessonCount: course.lessonCount,
		completedCount: course.completedCount,
		modules: course.modules.map((m) => ({
			id: m.id,
			title: m.title,
			lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, done: l.completedAt !== null }))
		})),
		current: current && {
			id: current.id,
			title: current.title,
			videoUrl: current.videoUrl,
			body: current.body,
			attachmentUrl: current.attachmentUrl,
			done: current.completedAt !== null
		},
		nextId: next?.id ?? null
	};
};

export const actions: Actions = {
	done: async ({ locals, request, url }) => {
		const user = requireUser(locals);
		const lesson = z.uuid().safeParse(url.searchParams.get('lesson'));
		if (!lesson.success) error(404);
		const done = (await request.formData()).get('done') === '1';
		const result = await act(() => setLessonDone(ctx, user.id, lesson.data, done));
		return result.ok ? { done } : fail(result.status, result.data);
	}
};
