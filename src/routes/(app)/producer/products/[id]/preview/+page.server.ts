import { ctx } from '#lib/server/app';
import { orNotFound, requireUser } from '#lib/server/http';
import { getProductEditor } from '#lib/server/services/catalog';
import { pickLesson } from '../../../../student/courses/[id]/player';
import type { PageServerLoad } from './$types';

// RF-16: the product as the student will see it, read-only. Only the owner gets in; another
// producer's product, or a malformed id, answers 404 (RNF-05), as the editor does. The
// lesson on screen is `?lesson=<id>`, and `?view=course` shows the content instead of the sales page.
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	const { name, status, brand, refundPolicy } = editor.product;
	const lessons = editor.modules.flatMap((m) => m.lessons);
	const current = pickLesson(
		lessons.map((l) => ({ ...l, completedAt: null })),
		url.searchParams.get('lesson')
	);
	return {
		view: url.searchParams.get('view') === 'course' ? ('course' as const) : ('sales' as const),
		product: { name, status, brand, refundPolicy },
		sections: editor.pages.sales.sections,
		offers: editor.offers
			.filter((o) => o.recurrence === 'one_time')
			.map(({ id, name, priceCents, guaranteeDays }) => ({ id, name, priceCents, guaranteeDays })),
		modules: editor.modules.map((m) => ({
			title: m.title,
			lessons: m.lessons.map((l) => ({ id: l.id, title: l.title }))
		})),
		current: current && {
			id: current.id,
			title: current.title,
			videoUrl: current.videoUrl,
			body: current.body,
			attachmentUrl: current.attachmentUrl
		}
	};
};
