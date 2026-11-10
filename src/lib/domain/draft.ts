// RF-11: a template's texts carry `{{name}}` placeholders that the wizard answers fill.

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/** Replaces every placeholder; an unknown one is a broken template, so it throws. */
export function fillText(text: string, values: Readonly<Record<string, string>>): string {
	return text.replace(PLACEHOLDER, (_, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`template placeholder {{${key}}} has no value`);
		return value;
	});
}

/** Fills every string inside a JSON value (pages, sections, fields), keeping its shape. */
export function fillDeep<T>(value: T, values: Readonly<Record<string, string>>): T {
	if (typeof value === 'string') return fillText(value, values) as T;
	if (Array.isArray(value)) return value.map((item: unknown) => fillDeep(item, values)) as T;
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, fillDeep(item, values)])
		) as T;
	}
	return value;
}
