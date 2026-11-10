/** Page numbers to show, with `null` where pages are skipped: 1 … 4 5 6 … 20. */
export function visiblePages(page: number, count: number): (number | null)[] {
	if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
	const wanted = new Set([1, count, page - 1, page, page + 1]);
	const sorted = [...wanted].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
	const result: (number | null)[] = [];
	for (const [index, n] of sorted.entries()) {
		const previous = sorted[index - 1];
		if (previous !== undefined && n - previous > 1) result.push(null);
		result.push(n);
	}
	return result;
}
