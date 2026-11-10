import { error, json } from '@sveltejs/kit';
import { JOBS_TOKEN } from '$app/env/private';
import { ctx } from '#lib/server/app';
import { runDailyJobs } from '#lib/server/jobs/daily';
import { sameToken } from '#lib/server/payment/simulated';
import type { RequestHandler } from './$types';

// Called once a day by the host's scheduler with `Authorization: Bearer <JOBS_TOKEN>`.
export const POST: RequestHandler = async ({ request }) => {
	const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? null;
	if (!sameToken(token, JOBS_TOKEN)) error(401);
	return json(await runDailyJobs(ctx));
};
