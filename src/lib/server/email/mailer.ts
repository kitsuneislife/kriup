// Transactional e-mail (RF-22). The provider is still open (decision D2); until then the
// app logs each message, and tests collect them in memory.

export interface Email {
	to: string;
	subject: string;
	text: string;
}

export interface Mailer {
	send(email: Email): Promise<void>;
}

export const logMailer: Mailer = {
	send: async ({ to, subject, text }) => {
		console.info(`[email] to=${to} subject=${subject}\n${text}`);
	}
};

export function memoryMailer(): Mailer & { sent: Email[] } {
	const sent: Email[] = [];
	return { sent, send: async (email) => void sent.push(email) };
}
