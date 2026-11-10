export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export type ToastItem = {
	id: number;
	title: string;
	description?: string;
	tone: ToastTone;
};

type ShowOptions = Omit<ToastItem, 'id' | 'tone'> & {
	tone?: ToastTone;
	/** Milliseconds on screen. 0 keeps it until dismissed. */
	duration?: number;
};

let next = 1;

export const toasts = $state<{ items: ToastItem[] }>({ items: [] });

export function dismiss(id: number) {
	toasts.items = toasts.items.filter((item) => item.id !== id);
}

/** Shows a toast and returns its id. Errors stay longer: people need time to read them. */
export function show({ tone = 'info', duration, ...rest }: ShowOptions): number {
	const id = next++;
	toasts.items = [...toasts.items.slice(-3), { id, tone, ...rest }];
	const ms = duration ?? (tone === 'danger' ? 8000 : 4000);
	if (ms > 0) setTimeout(() => dismiss(id), ms);
	return id;
}

export const toast = { show, dismiss };
