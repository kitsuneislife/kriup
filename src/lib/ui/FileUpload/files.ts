export type Rejection = { file: File; reason: 'type' | 'size' };

/** `accept` entries: "image/png", "image/*" or ".pdf" (same as the input attribute). */
function matches(file: File, accept: string[]): boolean {
	if (accept.length === 0) return true;
	const name = file.name.toLowerCase();
	return accept.some((entry) => {
		const rule = entry.trim().toLowerCase();
		if (rule.startsWith('.')) return name.endsWith(rule);
		if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
		return file.type === rule;
	});
}

export function splitFiles(
	files: File[],
	{ accept = [], maxBytes }: { accept?: string[]; maxBytes?: number }
): { accepted: File[]; rejected: Rejection[] } {
	const accepted: File[] = [];
	const rejected: Rejection[] = [];
	for (const file of files) {
		if (!matches(file, accept)) rejected.push({ file, reason: 'type' });
		else if (maxBytes !== undefined && file.size > maxBytes)
			rejected.push({ file, reason: 'size' });
		else accepted.push(file);
	}
	return { accepted, rejected };
}

const units = ['B', 'KB', 'MB', 'GB'];

/** 1536 -> "1,5 KB" */
export function formatBytes(bytes: number): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	const text = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(
		value
	);
	return `${text} ${units[unit]}`;
}
