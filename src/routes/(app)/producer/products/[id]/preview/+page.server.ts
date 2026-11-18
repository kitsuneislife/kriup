import { ctx } from '#lib/server/app';
import { orNotFound, requireUser } from '#lib/server/http';
import { getProductEditor } from '#lib/server/services/catalog';
import { pickLesson } from '../../../../student/courses/[id]/player';
import type { PageServerLoad } from './$types';

const views = ['sales', 'checkout', 'email', 'course'] as const;
type PreviewView = (typeof views)[number];

function viewOf(url: URL): PreviewView {
	const value = url.searchParams.get('view') ?? '';
	return (views as readonly string[]).includes(value) ? (value as PreviewView) : 'sales';
}

// RF-16: the product as the student will see it, read-only. Only the owner gets in; another
// producer's product, or a malformed id, answers 404 (RNF-05), as the editor does. The
// lesson on screen is `?lesson=<id>`, and `?view=` switches across the four touchpoints.
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	const { name, status, brand, refundPolicy } = editor.product;
	const lessons = editor.modules.flatMap((m) => m.lessons);
	const current = pickLesson(
		lessons.map((l) => ({ ...l, completedAt: null })),
		url.searchParams.get('lesson')
	);
	return {
		view: viewOf(url),
		product: { name, status, brand, refundPolicy },
		sections: editor.pages.sales.sections,
		checkoutSections: editor.pages.checkout.sections,
		emailSections: editor.pages.access_email.sections,
		offers: editor.offers.map(({ id, name, priceCents, guaranteeDays, recurrence }) => ({
			id,
			name,
			priceCents,
			guaranteeDays,
			recurrence
		})),
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
