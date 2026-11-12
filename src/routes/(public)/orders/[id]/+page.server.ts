import { dev } from '$app/env';
import { ctx } from '#lib/server/app';
import { orNotFound } from '#lib/server/http';
import { getPaymentStatus } from '#lib/server/services/checkout';
import type { PageServerLoad } from './$types';

// The order id is the key, so a buyer without an account follows the payment here; the
// page shows only the status and the charge (getPaymentStatus).
export const load: PageServerLoad = async ({ params, depends }) => {
	depends('app:order');
	const status = await orNotFound(getPaymentStatus(ctx, params.id));
	return {
		...status,
		// in development the simulated provider's page stands in for the bank app
		simulator: dev && status.charge ? status.charge.paymentUrl : null
	};
};
