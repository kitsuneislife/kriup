/** Points of a line in a `width` x `height` box, the first value on the left, the highest on top. */
export function linePoints(
	values: number[],
	width: number,
	height: number,
	pad = 2
): [x: number, y: number][] {
	if (values.length === 0) return [];
	const min = Math.min(...values);
	const span = Math.max(...values) - min || 1;
	const step = values.length > 1 ? width / (values.length - 1) : 0;
	return values.map((value, index) => [
		values.length > 1 ? index * step : width / 2,
		height - pad - ((value - min) / span) * (height - pad * 2)
	]);
}

/** Bar heights as a percentage of the highest value. Negative values count as 0. */
export function barHeights(values: number[]): number[] {
	const max = Math.max(0, ...values);
	return values.map((value) => (max === 0 ? 0 : (Math.max(0, value) / max) * 100));
}
