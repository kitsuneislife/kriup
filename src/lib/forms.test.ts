import { describe, expect, it, vi } from 'vitest';
import { Submission } from './forms.svelte';

type Submit = () => (opts: { update: () => Promise<void> }) => Promise<void>;
let submit: Submit | undefined;

vi.mock('$app/forms', () => ({
	enhance: (_form: HTMLFormElement, fn: Submit) => {
		submit = fn;
		return { destroy() {} };
	}
}));

describe('Submission', () => {
	it('is pending from the submit until the page is updated', async () => {
		const save = new Submission();
		save.enhance({} as HTMLFormElement);
		expect(save.loading('Salvando')).toBeUndefined();

		const after = submit!();
		expect(save.pending).toBe(true);
		expect(save.loading('Salvando')).toBe('Salvando');

		await after({ update: async () => {} });
		expect(save.pending).toBe(false);
	});

	it('stops pending when the update fails, so the button is usable again', async () => {
		const save = new Submission();
		save.enhance({} as HTMLFormElement);
		const after = submit!();
		await expect(after({ update: () => Promise.reject(new Error('offline')) })).rejects.toThrow();
		expect(save.pending).toBe(false);
	});
});
