import { error, fail } from '@sveltejs/kit';
import { ctx } from '#lib/server/app';
import { act, orNotFound, requireUser, type ActionFailure } from '#lib/server/http';
import { acceptInvite, cancelInvite, getContract } from '#lib/server/services/coproduction';
import type { Actions, PageServerLoad } from './$types';

// RF-51, RF-52, RN-12. getContract also answers the producer of the product; only the
// coproducer's screen lives here, so the producer and a stranger get the same 404, and a
// malformed id too. Accepting and refusing are two steps without JavaScript: `?accept` and
// `?refuse` show the confirmation, the action of the same name writes it.
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = requireUser(locals);
	const contract = await orNotFound(getContract(ctx, user.id, params.id));
	if (contract.coproducerId !== user.id) error(404);
	const pending = contract.status === 'invited';
	return {
		contract,
		confirming: pending ? (['accept', 'refuse'].find((k) => url.searchParams.has(k)) ?? null) : null
	};
};

const refuse = (target: string, failure: { status: number; data: ActionFailure }) =>
	fail(failure.status, { ...failure.data, for: target });

export const actions: Actions = {
	accept: async ({ locals, params }) => {
		const result = await act(() => acceptInvite(ctx, requireUser(locals).id, params.id));
		return result.ok ? { for: 'accept' } : refuse('accept', result);
	},
	refuse: async ({ locals, params }) => {
		const result = await act(() => cancelInvite(ctx, requireUser(locals).id, params.id));
		return result.ok ? { for: 'refuse' } : refuse('refuse', result);
	}
};
