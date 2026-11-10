import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismiss, show, toasts } from './store.svelte';

afterEach(() => {
	vi.useRealTimers();
	toasts.items = [];
});

describe('toast', () => {
	it('shows and dismisses', () => {
		const id = show({ title: 'Salvo' });
		expect(toasts.items).toHaveLength(1);
		expect(toasts.items[0]?.tone).toBe('info');
		dismiss(id);
		expect(toasts.items).toHaveLength(0);
	});

	it('removes itself after the duration', () => {
		vi.useFakeTimers();
		show({ title: 'Salvo', duration: 1000 });
		vi.advanceTimersByTime(999);
		expect(toasts.items).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(toasts.items).toHaveLength(0);
	});

	it('keeps at most four on screen', () => {
		for (let n = 0; n < 6; n++) show({ title: `n${n}`, duration: 0 });
		expect(toasts.items.map((item) => item.title)).toEqual(['n2', 'n3', 'n4', 'n5']);
	});
});
