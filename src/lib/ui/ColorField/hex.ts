export const isHexColor = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);

/** "0A84ff" or "#0a8" -> "#0a84ff". Returns undefined when it cannot be a color. */
export function normalizeHex(text: string): string | undefined {
	const raw = text.trim().replace(/^#/, '').toLowerCase();
	const full = raw.length === 3 ? [...raw].map((char) => char + char).join('') : raw;
	return isHexColor(`#${full}`) ? `#${full}` : undefined;
}

/** WCAG relative luminance of a `#rrggbb` color. */
function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((at) => {
		const c = parseInt(hex.slice(at, at + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * Black or white, whichever reads better on `hex`. The better of the two always passes
 * WCAG AA (4.5:1), so any brand color gets readable text.
 */
export function textOn(hex: string): '#000000' | '#ffffff' {
	if (!isHexColor(hex)) throw new RangeError(`not a #rrggbb color: ${hex}`);
	const l = luminance(hex);
	return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000000' : '#ffffff';
}
