export const isHexColor = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);

/** "0A84ff" or "#0a8" -> "#0a84ff". Returns undefined when it cannot be a color. */
export function normalizeHex(text: string): string | undefined {
	const raw = text.trim().replace(/^#/, '').toLowerCase();
	const full = raw.length === 3 ? [...raw].map((char) => char + char).join('') : raw;
	return isHexColor(`#${full}`) ? `#${full}` : undefined;
}
