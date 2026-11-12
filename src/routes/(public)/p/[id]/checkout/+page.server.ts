import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { act, formText, orNotFound, type ActionFailure } from '#lib/server/http';
import { getCheckout } from '#lib/server/services/catalog';
import { startCheckout } from '#lib/server/services/checkout';
import type { Actions, PageServerLoad } from './$types';

// RF-21: the offer comes in the address (`?offer=…`), so the sales page links straight here.
// An offer of another product, or of one not on sale, answers 404.

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const checkout = await orNotFound(getCheckout(ctx, url.searchParams.get('offer') ?? ''));
	if (checkout.product.id !== params.id) error(404);
	const buyer = locals.user && { name: locals.user.name, email: locals.user.email };
	return {
		product: checkout.product,
		offer: checkout.offer,
		sections: checkout.page.sections,
		buyer
	};
};

type Typed = { name: string; email: string; taxId: string; method: string };

export const actions: Actions = {
	default: async ({ locals, request, url }) => {
		const form = await request.formData();
		const typed: Typed = {
			name: formText(form, 'name'),
			email: formText(form, 'email'),
			taxId: formText(form, 'taxId'),
			method: formText(form, 'method')
		};
		const started = await act(() =>
			startCheckout(ctx, locals.user, {
				offerId: url.searchParams.get('offer') ?? '',
				// checked by checkoutSchema in the service
				method: typed.method as 'pix' | 'card',
				// a signed-in buyer buys as themself (RF-03)
				name: locals.user?.name ?? typed.name,
				email: locals.user?.email ?? typed.email,
				taxId: typed.taxId
			})
		);
		if (!started.ok) {
			return fail(started.status, { ...started.data, typed } satisfies ActionFailure & {
				typed: Typed;
			});
		}
		const { orderId, charge } = started.value;
		// a card is typed on the provider's page, never here; a Pix is paid from the order page
		redirect(
			303,
			typed.method === 'card'
				? charge.paymentUrl
				: resolve('/(public)/orders/[id]', { id: orderId })
		);
	}
};
