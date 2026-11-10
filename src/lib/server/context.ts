import type { Db } from './db/client';
import type { Mailer } from './email/mailer';
import type { PaymentGateway } from './payment/gateway';

/**
 * Everything a use case needs from the outside world. Routes get the app's one from
 * `server/app.ts`; tests build their own with a test database and fakes.
 */
export interface Ctx {
	db: Db;
	payments: PaymentGateway;
	mail: Mailer;
	/** Public origin of the site, for links in e-mails. */
	appUrl: string;
}

/** E-mail goes out after the commit; a failed send is logged, never undoes the work. */
export async function sendAfterCommit(ctx: Ctx, email: Parameters<Mailer['send']>[0]) {
	try {
		await ctx.mail.send(email);
	} catch (err) {
		console.error('[email] failed to send', { to: email.to, subject: email.subject, err });
	}
}

export const link = (ctx: Ctx, path: string) => new URL(path, ctx.appUrl).href;
